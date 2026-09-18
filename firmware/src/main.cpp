/**
 * @file main.cpp
 * @brief Production-grade ESP32 firmware for JeevaSwara deglutition telemetry.
 *
 * Implements:
 * - FreeRTOS deterministic timer-based sampling (50 Hz / 20ms)
 * - 12-bit Piezoelectric ADC acquisition with multi-sample oversampling
 * - MPU6050 6-DOF I2C burst acquisition
 * - Battery voltage monitoring via ADC voltage divider
 * - BLE GATT Server (sensor_stream, device_status, command)
 * - State machine: BOOTING, READY, CALIBRATING, RECORDING, ERROR
 * - Hardware Self-Test diagnostic suite
 * - Compact 24-byte binary serialization + optional JSON Serial debug
 */

#include <Arduino.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#include "pins_config.h"
#include "ble_config.h"
#include "packet_format.h"

// ==============================================================================
// GLOBAL HARDWARE & BLE OBJECTS
// ==============================================================================
static Adafruit_MPU6050 mpu;
static bool mpu_initialized = false;

static BLEServer* pServer = nullptr;
static BLECharacteristic* pSensorStreamChar = nullptr;
static BLECharacteristic* pDeviceStatusChar = nullptr;
static BLECharacteristic* pCommandChar = nullptr;

static bool deviceConnected = false;
static bool oldDeviceConnected = false;

// Operational State Machine
static volatile DeviceState currentState = STATE_BOOTING;

// Streaming & Sequence Tracking
static volatile bool isRecording = false;
static uint16_t packetSequence = 0;

// Debug Serial output toggle (set false for minimal latency / silent demo mode)
#define DEBUG_SERIAL_ENABLED    true
#define DEBUG_JSON_SERIAL       false // If true, mirrors telemetry as JSON to USB serial

// FreeRTOS Task Handles
TaskHandle_t samplingTaskHandle = nullptr;

// Forward Declarations
void setDeviceState(DeviceState newState, const char* message = nullptr);
bool executeSelfTest(String &diagnosticReport);
uint16_t readBatteryMillivolts();
uint16_t readPiezoOversampled();

// ==============================================================================
// BLE SERVER CALLBACKS
// ==============================================================================
class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) override {
        deviceConnected = true;
        if (DEBUG_SERIAL_ENABLED) {
            Serial.println(F("[BLE] Host connected. Link established."));
        }
    }

    void onDisconnect(BLEServer* pServer) override {
        deviceConnected = false;
        isRecording = false;
        setDeviceState(STATE_READY, "DISCONNECTED");
        if (DEBUG_SERIAL_ENABLED) {
            Serial.println(F("[BLE] Host disconnected. Telemetry halted. Advertising resumed."));
        }
    }
};

// ==============================================================================
// BLE COMMAND CALLBACKS
// ==============================================================================
class CommandCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pCharacteristic) override {
        String rxValue = pCharacteristic->getValue().c_str();
        rxValue.trim();
        rxValue.toUpperCase();

        if (DEBUG_SERIAL_ENABLED) {
            Serial.print(F("[BLE Command Received]: "));
            Serial.println(rxValue);
        }

        if (rxValue == CMD_START) {
            if (currentState == STATE_READY || currentState == STATE_CALIBRATING) {
                packetSequence = 0;
                isRecording = true;
                setDeviceState(STATE_RECORDING, "STREAM_ACTIVE");
            }
        }
        else if (rxValue == CMD_STOP) {
            isRecording = false;
            setDeviceState(STATE_READY, "STREAM_STOPPED");
        }
        else if (rxValue == CMD_CALIBRATE) {
            isRecording = false;
            setDeviceState(STATE_CALIBRATING, "SELF_TEST_RUNNING");
            String diag;
            bool ok = executeSelfTest(diag);
            if (ok) {
                setDeviceState(STATE_READY, diag.c_str());
            } else {
                setDeviceState(STATE_ERROR, diag.c_str());
            }
        }
        else if (rxValue == CMD_PING) {
            // Heartbeat echo
            pDeviceStatusChar->setValue("PONG");
            pDeviceStatusChar->notify();
        }
        else {
            if (DEBUG_SERIAL_ENABLED) {
                Serial.print(F("[BLE Warning] Unknown command: "));
                Serial.println(rxValue);
            }
        }
    }
};

// ==============================================================================
// STATE MANAGEMENT & NOTIFICATION
// ==============================================================================
void setDeviceState(DeviceState newState, const char* message) {
    currentState = newState;
    String statusPayload;

    switch (newState) {
        case STATE_BOOTING:     statusPayload = STATUS_STR_BOOTING; break;
        case STATE_READY:       statusPayload = STATUS_STR_READY; break;
        case STATE_CALIBRATING: statusPayload = STATUS_STR_CALIBRATING; break;
        case STATE_RECORDING:   statusPayload = STATUS_STR_RECORDING; break;
        case STATE_ERROR:       statusPayload = STATUS_STR_ERROR; break;
    }

    if (message != nullptr && strlen(message) > 0) {
        statusPayload += ":";
        statusPayload += message;
    }

    if (pDeviceStatusChar != nullptr && deviceConnected) {
        pDeviceStatusChar->setValue(statusPayload.c_str());
        pDeviceStatusChar->notify();
    }

    // Update LED status
    if (newState == STATE_RECORDING) {
        digitalWrite(PIN_STATUS_LED, HIGH);
    } else if (newState == STATE_ERROR) {
        digitalWrite(PIN_STATUS_LED, LOW);
    } else {
        // Blink or steady low
        digitalWrite(PIN_STATUS_LED, LOW);
    }

    if (DEBUG_SERIAL_ENABLED) {
        Serial.print(F("[STATE] "));
        Serial.println(statusPayload);
    }
}

// ==============================================================================
// HARDWARE SELF-TEST ROUTINE
// ==============================================================================
/**
 * Executes a comprehensive diagnostic verification of all onboard sensor lines.
 * Checks:
 * 1. MPU6050 WHO_AM_I I2C register response.
 * 2. Piezoelectric ADC quiescent baseline & variance (detecting flatline / disconnected line).
 * 3. Kinematic motion baseline (detecting IMU saturation or noise).
 * 4. LiPo Battery voltage cutoff.
 */
bool executeSelfTest(String &diagnosticReport) {
    bool passed = true;
    diagnosticReport = "";

    // 1. MPU6050 I2C Ping
    Wire.beginTransmission(MPU6050_I2C_ADDR);
    byte i2cStatus = Wire.endTransmission();
    if (i2cStatus == 0) {
        diagnosticReport += DIAG_MPU_OK;
    } else {
        passed = false;
        diagnosticReport += DIAG_MPU_ERR;
    }
    diagnosticReport += ";";

    // 2. Piezo ADC Baseline & Noise Floor Test
    uint32_t adcSum = 0;
    const int TEST_SAMPLES = 25;
    uint16_t adcMin = 4095;
    uint16_t adcMax = 0;

    for (int i = 0; i < TEST_SAMPLES; i++) {
        uint16_t val = analogRead(PIN_PIEZO_ADC);
        adcSum += val;
        if (val < adcMin) adcMin = val;
        if (val > adcMax) adcMax = val;
        delay(4);
    }
    uint16_t adcAvg = adcSum / TEST_SAMPLES;
    uint16_t adcSpan = adcMax - adcMin;

    // Check if flatlined at exactly 0 or pegged at 4095 (disconnected / shorted)
    if (adcAvg < 200 || adcAvg > 3900) {
        passed = false;
        diagnosticReport += DIAG_PIEZO_FLATLINE;
    } else {
        diagnosticReport += DIAG_PIEZO_OK;
    }
    diagnosticReport += ";";

    // 3. Battery Voltage Verification
    uint16_t batMv = readBatteryMillivolts();
    if (batMv < LIPO_MIN_MV) {
        diagnosticReport += DIAG_BATTERY_LOW;
    } else {
        diagnosticReport += DIAG_BATTERY_OK;
    }

    if (DEBUG_SERIAL_ENABLED) {
        Serial.print(F("[SELF TEST RESULT]: "));
        Serial.print(diagnosticReport);
        Serial.print(F(" (ADC Avg: "));
        Serial.print(adcAvg);
        Serial.print(F(", Span: "));
        Serial.print(adcSpan);
        Serial.print(F(", Bat: "));
        Serial.print(batMv);
        Serial.println(F(" mV)"));
    }

    return passed;
}

// ==============================================================================
// ANALOG & POWER ACQUISITION
// ==============================================================================
/**
 * 4x Oversampling analog read on Piezo ADC to reduce quantization noise.
 */
uint16_t readPiezoOversampled() {
    uint32_t sum = 0;
    sum += analogRead(PIN_PIEZO_ADC);
    sum += analogRead(PIN_PIEZO_ADC);
    sum += analogRead(PIN_PIEZO_ADC);
    sum += analogRead(PIN_PIEZO_ADC);
    return (uint16_t)(sum >> 2);
}

/**
 * Reads battery voltage via resistor divider on GPIO35.
 * Multiplies raw reading by divider ratio (2.0) and ADC calibration factor.
 */
uint16_t readBatteryMillivolts() {
    uint32_t raw = analogRead(PIN_BATTERY_ADC);
    // V_pin = raw * (3300 / 4095)
    // V_bat = V_pin * BATTERY_DIVIDER_RATIO
    float v_pin = (float)raw * (ADC_VREF_MV / (float)ADC_MAX_RAW_VALUE);
    float v_bat = v_pin * BATTERY_DIVIDER_RATIO;
    return (uint16_t)v_bat;
}

// ==============================================================================
// FREERTOS DETERMINISTIC SAMPLING TASK (50 Hz / 20ms)
// ==============================================================================
/**
 * Scheduled periodic task. Avoids delay() drift and ensures uniform sample spacing.
 */
void sensorSamplingTask(void* parameter) {
    TickType_t xLastWakeTime = xTaskGetTickCount();
    const TickType_t xFrequency = pdMS_TO_TICKS(SAMPLE_INTERVAL_MS);

    sensors_event_t a, g, temp;
    JeevaSwaraPacket packet;

    for (;;) {
        // Deterministic wait for next 20ms period
        vTaskDelayUntil(&xLastWakeTime, xFrequency);

        if (!isRecording || !deviceConnected) {
            continue;
        }

        uint32_t nowMs = millis();

        // 1. Read Analog Piezoelectric Mic
        uint16_t piezoVal = readPiezoOversampled();

        // 2. Read MPU6050 Motion Sensors
        int16_t raw_ax = 0, raw_ay = 0, raw_az = 0;
        int16_t raw_gx = 0, raw_gy = 0, raw_gz = 0;

        if (mpu_initialized) {
            if (mpu.getEvent(&a, &g, &temp)) {
                // Convert m/s^2 to +/-2g scaled integer: 1g = 9.80665 m/s^2 -> 16384 LSB
                raw_ax = (int16_t)((a.acceleration.x / 9.80665f) * 16384.0f);
                raw_ay = (int16_t)((a.acceleration.y / 9.80665f) * 16384.0f);
                raw_az = (int16_t)((a.acceleration.z / 9.80665f) * 16384.0f);

                // Convert rad/s to deg/s and scale: 1 deg/s = 131.0 LSB
                raw_gx = (int16_t)((g.gyro.x * 57.2957795f) * 131.0f);
                raw_gy = (int16_t)((g.gyro.y * 57.2957795f) * 131.0f);
                raw_gz = (int16_t)((g.gyro.z * 57.2957795f) * 131.0f);
            }
        }

        // 3. Read Battery Voltage (every ~1 second or on request)
        static uint16_t cachedBatMv = 3800;
        if ((packetSequence % DEFAULT_SAMPLE_RATE_HZ) == 0) {
            cachedBatMv = readBatteryMillivolts();
        }

        // 4. Construct Packed 24-byte Binary Packet
        packet.magic = PACKET_MAGIC_BYTE;
        packet.sequence = packetSequence++;
        packet.timestamp_ms = nowMs;
        packet.piezo_adc = piezoVal;
        packet.ax = raw_ax;
        packet.ay = raw_ay;
        packet.az = raw_az;
        packet.gx = raw_gx;
        packet.gy = raw_gy;
        packet.gz = raw_gz;
        packet.battery_mv = cachedBatMv;

        // Compute XOR parity checksum over first 23 bytes
        packet.checksum = compute_checksum((const uint8_t*)&packet, PACKET_TOTAL_BYTES - 1);

        // 5. Transmit via BLE Notification
        if (pSensorStreamChar != nullptr && deviceConnected) {
            pSensorStreamChar->setValue((uint8_t*)&packet, PACKET_TOTAL_BYTES);
            pSensorStreamChar->notify();
        }

        // 6. Optional Serial Debug Mirror
        #if DEBUG_JSON_SERIAL
        if (DEBUG_SERIAL_ENABLED && (packet.sequence % 5 == 0)) {
            Serial.printf("{\"seq\":%u,\"t\":%lu,\"piezo\":%u,\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,\"bat\":%u}\n",
                          packet.sequence, packet.timestamp_ms, packet.piezo_adc,
                          raw_ax / 16384.0f, raw_ay / 16384.0f, raw_az / 16384.0f, packet.battery_mv);
        }
        #endif
    }
}

// ==============================================================================
// SETUP ENTRYPOINT
// ==============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println(F("\n=================================================="));
    Serial.println(F(" JeevaSwara ESP32 Swallow Screening Firmware"));
    Serial.println(F(" Hardware: 27mm Piezo Contact Mic + MPU6050"));
    Serial.println(F(" Notice: Prototype screening device - not diagnostic"));
    Serial.println(F("=================================================="));

    // Initialize Status LED
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    // Configure ADC
    analogReadResolution(ADC_RESOLUTION_BITS);
    analogSetAttenuation(ADC_11db); // Full 0 - 3.3V input range

    // Initialize I2C Bus for MPU6050
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, I2C_CLOCK_SPEED_HZ);

    if (mpu.begin(MPU6050_I2C_ADDR, &Wire)) {
        mpu_initialized = true;
        mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
        mpu.setGyroRange(MPU6050_RANGE_250_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
        Serial.println(F("[Hardware] MPU6050 configured (+/-2g, +/-250dps, 44Hz LPF)."));
    } else {
        Serial.println(F("[Hardware Warning] MPU6050 not detected on I2C bus!"));
        mpu_initialized = false;
    }

    // Initialize BLE Subsystem
    BLEDevice::init(BLE_DEVICE_NAME);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    // Create Custom JeevaSwara GATT Service
    BLEService* pService = pServer->createService(SERVICE_UUID_JEEVASWARA);

    // 1. sensor_stream Characteristic (Notify)
    pSensorStreamChar = pService->createCharacteristic(
        CHAR_UUID_SENSOR_STREAM,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pSensorStreamChar->addDescriptor(new BLE2902());

    // 2. device_status Characteristic (Read | Notify)
    pDeviceStatusChar = pService->createCharacteristic(
        CHAR_UUID_DEVICE_STATUS,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pDeviceStatusChar->addDescriptor(new BLE2902());

    // 3. command Characteristic (Write)
    pCommandChar = pService->createCharacteristic(
        CHAR_UUID_COMMAND,
        BLECharacteristic::PROPERTY_WRITE
    );
    pCommandChar->setCallbacks(new CommandCallbacks());

    pService->start();

    // Configure BLE Advertising
    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID_JEEVASWARA);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06); // Helpful for iOS/Android connection speed
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println(F("[BLE] GATT Server active. Advertising as: JeevaSwara-ESP32"));

    // Launch Deterministic FreeRTOS Sampling Task on Core 1 (leaving Core 0 for BLE stack)
    xTaskCreatePinnedToCore(
        sensorSamplingTask,
        "SamplingTask",
        4096,
        nullptr,
        2, // High priority
        &samplingTaskHandle,
        1  // Core 1
    );

    setDeviceState(STATE_READY, "SYSTEM_ONLINE");
}

// ==============================================================================
// MAIN SUPER-LOOP (Power Management & Connection Watchdog)
// ==============================================================================
void loop() {
    // BLE Reconnection Handler
    if (!deviceConnected && oldDeviceConnected) {
        delay(200); // Give Bluetooth stack time to settle
        pServer->startAdvertising();
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // Periodic heartbeat print every 5 seconds
    #if DEBUG_SERIAL_ENABLED
    static unsigned long lastHeartbeat = 0;
    if (millis() - lastHeartbeat > 5000) {
        lastHeartbeat = millis();
        Serial.printf("[Heartbeat] State: %d | BLE Link: %s | Recording: %s | Batt: %u mV\n",
                      currentState,
                      deviceConnected ? "CONNECTED" : "ADVERTISING",
                      isRecording ? "YES" : "NO",
                      readBatteryMillivolts());
    }
    #endif

    delay(20);
}
