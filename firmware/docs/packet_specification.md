# JeevaSwara Telemetry Packet Specification

> **Version:** 1.0.0-research  
> **Target Peripheral:** ESP32 (Dual Core 240 MHz)  
> **Host Protocol:** Bluetooth Low Energy (GATT Notification) & Serial Debug  
> **Notice:** Research prototype specification – not a cleared medical diagnostic device.

---

## 1. Overview

The JeevaSwara sensor subsystem collects synchronized acoustic deglutition waveforms from a 27 mm piezoelectric contact microphone and kinematic hyolaryngeal excursions from an MPU6050 6-DOF IMU.

To maximize BLE transmission efficiency and minimize latency over the 50 Hz / 100 Hz timer-driven sampling loop, telemetry is packed into a **24-byte compact binary struct** sent over the `sensor_stream` characteristic (`beb5483e-36e1-4688-b7f5-ea07361b26a8`).

---

## 2. Binary Packet Structure (24 Bytes)

Byte ordering is **Little-Endian** (`<` in Python `struct`, native to Xtensa LX6 and x86/ARM).

| Byte Offset | Field Name | Type | Size | Physical Units | Description / Scaling |
|---|---|---|---|---|---|
| `0x00` | `magic` | `uint8_t` | 1 | — | Frame synchronization byte. Must equal `0xAA`. |
| `0x01` | `sequence` | `uint16_t` | 2 | Counts | Rolling sequence counter (`0` to `65535`). Used for packet loss detection. |
| `0x03` | `timestamp_ms` | `uint32_t` | 4 | Milliseconds | Monotonic millisecond counter since ESP32 boot (`millis()`). |
| `0x07` | `piezo_adc` | `uint16_t` | 2 | ADC LSB | Raw 12-bit ADC reading (`0` to `4095`). Centered around $1.65\text{V}$ ($\approx 2048$). |
| `0x09` | `ax` | `int16_t` | 2 | $g$ | Accelerometer X: Scale by $\frac{1}{16384}$ ($\pm 2\text{g}$ full scale). |
| `0x0B` | `ay` | `int16_t` | 2 | $g$ | Accelerometer Y: Scale by $\frac{1}{16384}$ ($\pm 2\text{g}$ full scale). |
| `0x0D` | `az` | `int16_t` | 2 | $g$ | Accelerometer Z: Scale by $\frac{1}{16384}$ ($\pm 2\text{g}$ full scale). |
| `0x0F` | `gx` | `int16_t` | 2 | $^\circ/\text{s}$ | Gyroscope X: Scale by $\frac{1}{131.0}$ ($\pm 250^\circ/\text{s}$ full scale). |
| `0x11` | `gy` | `int16_t` | 2 | $^\circ/\text{s}$ | Gyroscope Y: Scale by $\frac{1}{131.0}$ ($\pm 250^\circ/\text{s}$ full scale). |
| `0x13` | `gz` | `int16_t` | 2 | $^\circ/\text{s}$ | Gyroscope Z: Scale by $\frac{1}{131.0}$ ($\pm 250^\circ/\text{s}$ full scale). |
| `0x15` | `battery_mv` | `uint16_t` | 2 | $\text{mV}$ | LiPo battery voltage in millivolts ($3300\text{ mV}$ to $4200\text{ mV}$). |
| `0x17` | `checksum` | `uint8_t` | 1 | — | Bitwise XOR parity checksum of bytes `0x00` through `0x16`. |

---

## 3. Engineering Unit Conversions

Upon receipt of the 24-byte payload by the Python Bleak client, values are transformed as follows:

### 3.1 Piezoelectric Normalization
$$V_{\text{norm}} = \frac{\text{piezo\_adc} - 2048}{2048.0}$$
- Output range: $[-1.0, +1.0]$ normalized signal amplitude.
- A value of $2048$ represents the quiescent virtual ground baseline ($1.65\text{V}$).

### 3.2 Accelerometer Scaling ($\pm 2\text{g}$)
$$a_x = \frac{\text{ax}}{16384.0}, \quad a_y = \frac{\text{ay}}{16384.0}, \quad a_z = \frac{\text{az}}{16384.0} \quad [\text{in units of } g]$$
Resultant acceleration magnitude:
$$|a| = \sqrt{a_x^2 + a_y^2 + a_z^2} \quad [\text{in units of } g]$$

### 3.3 Gyroscope Scaling ($\pm 250^\circ/\text{s}$)
$$\omega_x = \frac{\text{gx}}{131.0}, \quad \omega_y = \frac{\text{gy}}{131.0}, \quad \omega_z = \frac{\text{gz}}{131.0} \quad [^\circ/\text{s}]$$

### 3.4 Battery Percentage Approximation
$$\text{Battery \%} = \text{clamp}\left(\frac{\text{battery\_mv} - 3300}{4200 - 3300} \times 100\%, \ 0\%, \ 100\%\right)$$

---

## 4. Checksum Verification Algorithm

The checksum at offset `0x17` is computed by calculating the running bitwise XOR over the first 23 bytes:

```c
uint8_t compute_checksum(const uint8_t *buffer, size_t len) {
    uint8_t c = 0;
    for (size_t i = 0; i < len; i++) {
        c ^= buffer[i];
    }
    return c;
}
```

```python
def verify_checksum(packet_bytes: bytes) -> bool:
    if len(packet_bytes) != 24:
        return False
    computed = 0
    for b in packet_bytes[:23]:
        computed ^= b
    return computed == packet_bytes[23]
```

---

## 5. Packet Loss Detection

Sequence numbers count monotonically from `0` to `65535` and wrap to `0`.

$$\Delta_{\text{seq}} = (\text{seq}_{\text{current}} - \text{seq}_{\text{last}} - 1) \pmod{65536}$$

- If $\Delta_{\text{seq}} == 0$: No packet was lost.
- If $0 < \Delta_{\text{seq}} < 30000$: Exactly $\Delta_{\text{seq}}$ packets were dropped by the BLE radio or host stack.
- Rolling packet loss rate:
  $$\text{Loss Rate} = \frac{\text{Total Packets Lost}}{\text{Total Packets Received} + \text{Total Packets Lost}} \times 100\%$$

---

## 6. Optional Serial Debug Format (JSON)

When `DEBUG_JSON_SERIAL` is enabled in `main.cpp`, the ESP32 outputs readable JSON at $115200\text{ baud}$:

```json
{
  "seq": 142,
  "t": 2840,
  "piezo": 2085,
  "ax": 0.024,
  "ay": -0.015,
  "az": 0.982,
  "bat": 3840
}
```
*(Disabled by default during high-throughput screening to minimize UART TX FIFO contention).*
