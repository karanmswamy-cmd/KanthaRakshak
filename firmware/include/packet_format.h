/**
 * @file packet_format.h
 * @brief Binary telemetry packet layout for JeevaSwara ESP32 sensor transmission.
 *
 * Defines the compact 24-byte binary serialization structure transmitted
 * over the BLE sensor_stream characteristic.
 */

#ifndef PACKET_FORMAT_H
#define PACKET_FORMAT_H

#include <stdint.h>
#include <stddef.h>

#define PACKET_MAGIC_BYTE   0xAA
#define PACKET_TOTAL_BYTES  24

#pragma pack(push, 1)
/**
 * @struct JeevaSwaraPacket
 * @brief Packed 24-byte sensor frame.
 * Little-endian byte ordering (native to ESP32 and x86/ARM host).
 */
typedef struct {
    uint8_t  magic;          // 0x00: 0xAA synchronization marker
    uint16_t sequence;       // 0x01: Rolling sequence counter (0 to 65535)
    uint32_t timestamp_ms;   // 0x03: ESP32 monotonic millisecond timer
    uint16_t piezo_adc;      // 0x07: 12-bit ADC reading (0 to 4095)
    int16_t  ax;             // 0x09: Acceleration X (LSB = 1/16384 g for +/-2g)
    int16_t  ay;             // 0x0B: Acceleration Y (LSB = 1/16384 g for +/-2g)
    int16_t  az;             // 0x0D: Acceleration Z (LSB = 1/16384 g for +/-2g)
    int16_t  gx;             // 0x0F: Gyroscope X (LSB = 1/131.0 deg/s for +/-250 dps)
    int16_t  gy;             // 0x11: Gyroscope Y (LSB = 1/131.0 deg/s for +/-250 dps)
    int16_t  gz;             // 0x13: Gyroscope Z (LSB = 1/131.0 deg/s for +/-250 dps)
    uint16_t battery_mv;     // 0x15: Battery level in millivolts (e.g., 3850 mV)
    uint8_t  checksum;       // 0x17: XOR parity checksum of bytes 0 to 22
} JeevaSwaraPacket;
#pragma pack(pop)

/**
 * Calculates XOR checksum across bytes 0 to len-1.
 */
static inline uint8_t compute_checksum(const uint8_t *buffer, size_t len) {
    uint8_t c = 0;
    for (size_t i = 0; i < len; i++) {
        c ^= buffer[i];
    }
    return c;
}

#endif // PACKET_FORMAT_H
