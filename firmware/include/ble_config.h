/**
 * @file ble_config.h
 * @brief Bluetooth Low Energy GATT configuration for JeevaSwara ESP32.
 *
 * Defines custom UUIDs, characteristic attributes, operational states,
 * and command protocol for communicating with the Python Bleak bridge.
 */

#ifndef BLE_CONFIG_H
#define BLE_CONFIG_H

// ==============================================================================
// 1. BLE ADVERTISING AND DEVICE IDENTITY
// ==============================================================================
#define BLE_DEVICE_NAME             "JeevaSwara-ESP32"
#define BLE_MANUFACTURER_ID         0x02E5 // Custom research identifier

// ==============================================================================
// 2. CUSTOM GATT SERVICE & CHARACTERISTIC UUIDS (128-bit)
// ==============================================================================
/**
 * Primary deglutition screening telemetry service.
 */
#define SERVICE_UUID_JEEVASWARA     "4fafc201-1fb5-459e-8fcc-c5c9c331914b"

/**
 * High-speed binary telemetry stream (NOTIFY).
 * Emits packed 24-byte sensor frames at scheduled sample rate (e.g. 50 Hz).
 */
#define CHAR_UUID_SENSOR_STREAM     "beb5483e-36e1-4688-b7f5-ea07361b26a8"

/**
 * Device status and telemetry health (READ | NOTIFY).
 * Emits current device state and self-test verification codes.
 */
#define CHAR_UUID_DEVICE_STATUS     "8f8e8188-751d-40e9-b5ef-77b3191c4be2"

/**
 * Host control command interface (WRITE).
 * Accepts UTF-8 strings: 'START', 'STOP', 'CALIBRATE', 'PING'.
 */
#define CHAR_UUID_COMMAND           "cba1d466-344c-4be3-ab3f-189f80dd7518"

// ==============================================================================
// 3. DEVICE OPERATIONAL STATES
// ==============================================================================
enum DeviceState {
    STATE_BOOTING       = 0,
    STATE_READY         = 1,
    STATE_CALIBRATING   = 2,
    STATE_RECORDING     = 3,
    STATE_ERROR         = 4
};

// String representations for status payloads
#define STATUS_STR_BOOTING          "BOOTING"
#define STATUS_STR_READY            "READY"
#define STATUS_STR_CALIBRATING      "CALIBRATING"
#define STATUS_STR_RECORDING        "RECORDING"
#define STATUS_STR_ERROR            "ERROR"

// ==============================================================================
// 4. CONTROL COMMAND TOKENS
// ==============================================================================
#define CMD_START                   "START"
#define CMD_STOP                    "STOP"
#define CMD_CALIBRATE               "CALIBRATE"
#define CMD_PING                    "PING"

// ==============================================================================
// 5. SELF-TEST RESPONSE STRINGS
// ==============================================================================
#define DIAG_PIEZO_OK               "PIEZO_OK"
#define DIAG_PIEZO_FLATLINE         "PIEZO_ERR_FLATLINE"
#define DIAG_MPU_OK                 "MPU_OK"
#define DIAG_MPU_ERR                "MPU_ERR_NO_REPLY"
#define DIAG_BATTERY_OK             "BATTERY_OK"
#define DIAG_BATTERY_LOW            "BATTERY_WARN_LOW"

#endif // BLE_CONFIG_H
