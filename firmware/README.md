# JeevaSwara ESP32 Firmware & Hardware Communication Layer

> **Non-Invasive Cervical Deglutition Screening Subsystem**  
> *Tagline:* Every Swallow Counts  
> *Notice:* Hackathon research prototype. Not a cleared medical diagnostic device. Do not fabricate clinical accuracy.

---

## 1. Subsystem Directory Structure

```
firmware/
├── platformio.ini                 # PlatformIO project configuration
├── include/
│   ├── pins_config.h             # Hardware pin mappings (ADC GPIO34, I2C SDA 21 / SCL 22, Batt GPIO35)
│   ├── ble_config.h              # Custom BLE service & characteristic UUIDs, states, and commands
│   └── packet_format.h           # Packed 24-byte binary telemetry struct and checksum logic
├── src/
│   └── main.cpp                  # FreeRTOS scheduled timer sampling, MPU6050, ADC, BLE GATT server
├── docs/
│   ├── packet_specification.md   # Comprehensive binary packet documentation, scaling factors & byte offsets
│   └── hardware_schematic.md     # Wiring diagram, op-amp biasing circuit, battery divider, and safety rules
├── python_bridge/
│   ├── ble_bridge.py             # Asynchronous Python Bleak client with ring-buffer & reconnect
│   └── requirements.txt          # Bleak, asyncio, aiohttp dependencies
└── README.md                     # This setup, compilation, and troubleshooting guide
```

---

## 2. Hardware Architecture & Pin Map

| Component | Signal | ESP32 GPIO | Electrical Specifications |
|---|---|---|---|
| **27mm Piezo Preamp** | Conditioned Audio | **GPIO34** | 12-bit ADC1 (Input only). Midpoint biased at $1.65\text{V}$, clamped to $[0\text{V}, 3.3\text{V}]$. |
| **MPU6050 IMU** | I2C SDA | **GPIO21** | $3.3\text{V}$ Logic. Hardware I2C (400 kHz). |
| **MPU6050 IMU** | I2C SCL | **GPIO22** | $3.3\text{V}$ Logic. Hardware I2C (400 kHz). |
| **LiPo Battery Monitor**| $V_{\text{bat}} / 2$ | **GPIO35** | 12-bit ADC1. Resistor divider ($100\text{k}\Omega / 100\text{k}\Omega$). |
| **Status LED** | Active High | **GPIO2** | On-board indicator (Solid: Recording, Off: Ready/Error). |

---

## 3. Flashing & Compilation Guide

### Method A: PlatformIO (Recommended)
1. Install [PlatformIO Core](https://platformio.org/) or the PlatformIO extension in VS Code.
2. Connect the ESP32 board via micro-USB.
3. Open a terminal in the `firmware/` directory:
   ```bash
   cd firmware
   pio run --target upload
   ```
4. Monitor serial logs:
   ```bash
   pio device monitor
   ```

### Method B: Arduino IDE
1. Install ESP32 board support via the Boards Manager: `esp32 by Espressif Systems` (v2.0.14+).
2. Install required libraries via Library Manager:
   - `Adafruit MPU6050`
   - `Adafruit BusIO`
   - `Wire`
3. Copy headers from `include/` into your Arduino sketch directory or set sketchbook include paths.
4. Select board: `ESP32 Dev Module`, Flash Frequency: `80MHz`, Upload Speed: `921600`.
5. Compile and flash.

---

## 4. Bluetooth Low Energy (BLE) GATT Profile

- **Advertised Device Name:** `JeevaSwara-ESP32`
- **Primary Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b` (`JEEVASWARA_SERVICE`)

| Characteristic | UUID | Properties | Payload / Format |
|---|---|---|---|
| **`sensor_stream`** | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | `NOTIFY` | 24-byte compact binary struct (Sequence, Time, Piezo, Accel XYZ, Gyro XYZ, Battery, Checksum). |
| **`device_status`** | `8f8e8188-751d-40e9-b5ef-77b3191c4be2` | `READ`, `NOTIFY` | UTF-8 string: `BOOTING`, `READY`, `CALIBRATING`, `RECORDING`, `ERROR`. |
| **`command`** | `cba1d466-344c-4be3-ab3f-189f80dd7518` | `WRITE` | ASCII tokens: `START`, `STOP`, `CALIBRATE`, `PING`. |

### Hardware Self-Test Commands:
When the host sends `CALIBRATE`:
1. Checks MPU6050 `WHO_AM_I` register ($0\text{x}68$).
2. Validates quiescent acoustic ADC variance and midpoint baseline (detects flatline or disconnected microphone).
3. Verifies static gravity vector on accelerometer.
4. Verifies battery voltage is above cutoff threshold ($>3.3\text{V}$).
5. Returns diagnostic code: `PIEZO_OK;MPU_OK;BATTERY_OK` and transitions to `READY`.

---

## 5. Running the Python Bleak Bridge

The Python bridge provides the connection between the physical ESP32 and the FastAPI backend, eliminating browser Web Bluetooth incompatibilities.

### 5.1 Environment Setup
```bash
cd firmware/python_bridge
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 5.2 Test Streaming CLI
```bash
python ble_bridge.py
```
Expected output:
```text
==================================================
 JeevaSwara ESP32 BLE Bridge CLI Client
==================================================
Scanning for BLE device: 'JeevaSwara-ESP32'...
Found target peripheral: JeevaSwara-ESP32 [XX:XX:XX:XX:XX:XX] (RSSI: -56 dBm)
Connected to JeevaSwara-ESP32 successfully.
Subscribed to sensor_stream notifications.
Subscribed to device_status notifications.

Requesting hardware self-test (CALIBRATE)...
>>> Device State: CALIBRATING:SELF_TEST_RUNNING
>>> Device State: READY:PIEZO_OK;MPU_OK;BATTERY_OK;

Starting continuous sensor stream (START)...
[# 00025 | 0000500 ms] Piezo: +0.012 V | Accel: (+0.02, -0.01, +0.98) g | Mag: 0.981 g | Bat: 88% (3860 mV)
[# 00050 | 0001000 ms] Piezo: -0.005 V | Accel: (+0.01, +0.00, +0.98) g | Mag: 0.980 g | Bat: 88% (3860 mV)
...
```

---

## 6. Electrical Safety Mandate

> [!CAUTION]
> **BATTERY-ONLY PARTICIPANT CONTACT:**
> - The prototype must **never** be connected to a PC USB cable or mains wall adapter while the sensor is placed on a participant's throat.
> - Charge the LiPo battery via the TP4056 board **only** when the device is completely powered down and removed from the participant.
> - Ensure the 27mm brass contact disc is encapsulated in an electrically non-conductive medical-grade silicone sleeve.
