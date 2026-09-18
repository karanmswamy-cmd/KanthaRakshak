/**
 * @file pins_config.h
 * @brief Pin definitions and hardware configuration for JeevaSwara ESP32.
 *
 * Configures ADC channels, I2C bus pins, battery voltage monitoring,
 * and electrical conditioning parameters.
 */

#ifndef PINS_CONFIG_H
#define PINS_CONFIG_H

#include <stdint.h>

// ==============================================================================
// 1. ANALOG PIEZOELECTRIC SENSOR CONFIGURATION
// ==============================================================================
/**
 * Default Piezoelectric analog input pin.
 * GPIO34 is an input-only ADC1 channel on the ESP32 (ADC1_CHANNEL_6).
 * ADC1 is safe to use concurrently with WiFi/BLE (unlike ADC2 pins).
 *
 * ELECTRICAL WARNING:
 * The piezo disc must be connected through an analog conditioning stage
 * with a virtual ground reference (1.65V DC bias) and clamping protection.
 * Raw piezo discs can output >10V spikes during swallow or cough events!
 */
#define PIN_PIEZO_ADC           34

// ADC resolution (12-bit = 0 to 4095)
#define ADC_RESOLUTION_BITS     12
#define ADC_MAX_RAW_VALUE       4095

// ADC reference voltage in millivolts
#define ADC_VREF_MV             3300

// Theoretical 1.65V DC midpoint bias raw value (1.65V / 3.3V * 4095 ~= 2048)
#define PIEZO_BIAS_RAW_NOMINAL  2048

// ==============================================================================
// 2. MPU6050 6-AXIS IMU I2C CONFIGURATION
// ==============================================================================
/**
 * Hardware I2C pins for MPU6050 hyolaryngeal motion excursion tracking.
 * Standard ESP32 hardware I2C peripheral (I2C_NUM_0).
 */
#define PIN_I2C_SDA             21
#define PIN_I2C_SCL             22
#define I2C_CLOCK_SPEED_HZ      400000   // 400 kHz Fast-Mode I2C

// Default MPU6050 7-bit I2C address (AD0 pulled LOW = 0x68; AD0 HIGH = 0x69)
#define MPU6050_I2C_ADDR        0x68

// ==============================================================================
// 3. BATTERY VOLTAGE MONITORING CONFIGURATION
// ==============================================================================
/**
 * Battery voltage monitor via 2x 100k ohm resistor divider from LiPo battery.
 * GPIO35 is an input-only ADC1 pin (ADC1_CHANNEL_7).
 * Divider ratio: 100k / (100k + 100k) = 0.5.
 * Max LiPo voltage: 4.2V -> Pin voltage: 2.1V (well within 3.3V ADC span).
 */
#define PIN_BATTERY_ADC         35
#define BATTERY_DIVIDER_RATIO   2.0f     // Multiply pin voltage by 2.0 to get V_bat
#define LIPO_MAX_MV             4200     // 100% capacity
#define LIPO_MIN_MV             3300     // 0% capacity / low battery cutoff

// ==============================================================================
// 4. ON-BOARD STATUS LED
// ==============================================================================
#define PIN_STATUS_LED          2        // Standard built-in LED on ESP32 DevKit

// ==============================================================================
// 5. SAMPLING TIMER CONFIGURATION
// ==============================================================================
#define DEFAULT_SAMPLE_RATE_HZ  50       // 50 Hz (20 ms interval)
#define SAMPLE_INTERVAL_MS      (1000 / DEFAULT_SAMPLE_RATE_HZ)

#endif // PINS_CONFIG_H
