# JeevaSwara Hardware Wiring, Conditioning & Electrical Safety Guide

> **Notice:** The JeevaSwara prototype is an engineering research prototype and **not** a cleared commercial medical device.  
> Adhere strictly to the safety guidelines regarding patient isolation and power source selection.

---

## 1. Pin Assignment Table

| Module | Pin Function | ESP32 GPIO | Electrical Specs / Notes |
|---|---|---|---|
| **Piezo Preamp** | Conditioned Audio Out | **GPIO34** | ADC1 Channel 6. Input only. Biased at $1.65\text{V}$, clamped $[0\text{V}, 3.3\text{V}]$. |
| **MPU6050 IMU** | I2C SDA (Data) | **GPIO21** | $3.3\text{V}$ Logic. Hardware I2C with $4.7\text{k}\Omega$ pull-up resistors. |
| **MPU6050 IMU** | I2C SCL (Clock) | **GPIO22** | $3.3\text{V}$ Logic. $400\text{ kHz}$ Fast-Mode I2C bus. |
| **MPU6050 IMU** | VCC | **3V3** | Regulated $3.3\text{V}$ power rail. (Do NOT use 5V on breakout VCC without onboard LDO). |
| **MPU6050 IMU** | GND | **GND** | Common ground reference. |
| **MPU6050 IMU** | AD0 | **GND** | Sets 7-bit I2C address to `0x68`. (Tie to 3.3V for `0x69`). |
| **Battery Divider**| $V_{\text{bat}} / 2$ | **GPIO35** | ADC1 Channel 7. Input only. Resistor divider from LiPo ($100\text{k}\Omega + 100\text{k}\Omega$). |
| **Status Indicator**| On-board LED | **GPIO2** | Active-high LED indicator (steady in Recording, off in Error). |

---

## 2. Piezoelectric Analog Conditioning & Protection Circuit

### 2.1 Why Analog Conditioning is Mandatory
A raw $27\text{ mm}$ brass piezoelectric disc acts as a high-impedance voltage generator. During deep swallows, throat clearance, or accidental coughs, an unconditioned disc can generate **bipolar spikes exceeding $\pm 15\text{V}$**.
- **Negative voltages** ($< -0.3\text{V}$) trigger ESP32 substrate parasitic diodes, risking internal CMOS latch-up.
- **Voltages $> 3.6\text{V}$** permanently degrade or burn out the ESP32 ADC pin.
- **Single-Supply ADC:** The ESP32 ADC only measures voltages from $0\text{V}$ to $3.3\text{V}$. The AC swallow acoustic signal must be elevated to a positive midpoint reference ($V_{\text{ref}} = 1.65\text{V}$).

### 2.2 Schematic Diagram

```
                 +3.3V Rail
                    │
                   [R1: 100kΩ]
                    │
                    ├─── Virtual Ground Reference (Vref = 1.65V)
                    │    (Decoupled with 10µF + 100nF to GND)
                   [R2: 100kΩ]
                    │
                   GND

 Piezo (+) ──┬──[C1: 1µF]──┬──[R_in: 10kΩ]──┬──(+) Non-Inverting Input
             │  (DC Block) │                │     (MCP6002 Rail-to-Rail Op-Amp)
           [R_p: 1MΩ]    [R_bias: 100kΩ]    ├──[D1: BAT54S to 3.3V]
             │             │                ├──[D2: BAT54S to GND]
 Piezo (-) ──┴─────────────┴────────────────┤ (Clamping Diodes)
           (Brass Ground)  (to Vref = 1.65V)
                                            │
                                          [Op-Amp]──[R_out: 470Ω]──> ESP32 GPIO34
                                            │
                                            └── Feedback Loop (Gain = 1x to 5x)
```

### 2.3 Component Functions:
1. **$R_p$ ($1\text{M}\Omega$ Parallel Bleed):** Provides a high-input-impedance load across the ceramic crystal to drain static charge without loading the sub-audible acoustic pressure waves ($10\text{ Hz} - 300\text{ Hz}$).
2. **$C_1$ ($1\mu\text{F}$ Ceramic) + $R_{\text{bias}}$ ($100\text{k}\Omega$):** AC coupling high-pass filter with a $-3\text{dB}$ cutoff frequency of:
   $$f_c = \frac{1}{2\pi R C} = \frac{1}{2\pi \times 10^5 \times 10^{-6}} \approx 1.59\text{ Hz}$$
   Attenuates very slow respiratory drift while retaining $20\text{ Hz} - 300\text{ Hz}$ pharyngeal deglutition acoustics.
3. **Virtual Ground ($V_{\text{ref}} = 1.65\text{V}$):** Formed by a precision $100\text{k}\Omega / 100\text{k}\Omega$ divider, centering the signal at the exact midpoint of the $0 - 3.3\text{V}$ ADC span.
4. **BAT54S Dual Schottky Barrier Diode:** High-speed clamping array that guarantees the analog input voltage never dips below $-0.2\text{V}$ or exceeds $+3.5\text{V}$.
5. **Op-Amp (MCP6002 or LMV358):** Low-noise rail-to-rail single-supply operational amplifier configured with a small gain ($A_v \approx 2 - 4$) and low-impedance output buffer.

---

## 3. Power Supply, Battery Monitoring & TP4056 Integration

### 3.1 Power Management Circuit

```
  [Single-Cell LiPo Battery 3.7V (500mAh - 1200mAh)]
              │                      │
            (BAT+)                 (BAT-)
              │                      │
       [TP4056 Charger Board: B+ and B- Inputs]
              │                      │
            (OUT+)                 (OUT-)
              │                      │
        [SPDT Power Switch]          │
              │                      │
              ├──────[100kΩ]──┬──────┼───> ESP32 GPIO35 (Battery ADC Monitor)
              │               │      │
              │             [100kΩ]  │
              │               │      │
              ├───────────────┴──────┘
              │                      │
     [ESP32 3.3V Low-Dropout Regulator (LDO: e.g. ME6211 / AP2112K)]
              │                      │
            +3.3V                   GND
```

### 3.2 Battery Monitoring Formula:
The $100\text{k}\Omega / 100\text{k}\Omega$ voltage divider divides the battery terminal voltage by $2.0$:
$$V_{\text{pin}} = V_{\text{bat}} \times \frac{100\text{k}\Omega}{100\text{k}\Omega + 100\text{k}\Omega} = \frac{V_{\text{bat}}}{2}$$
When the LiPo is fully charged at $4.2\text{V}$, $V_{\text{pin}} = 2.1\text{V}$, safely below the $3.3\text{V}$ ceiling of ADC1 GPIO35.

---

## 4. Critical Electrical Safety & Patient Isolation Rules

> [!CAUTION]
> ### STRICT SAFETY MANDATE: BATTERY POWER ONLY DURING PATIENT ATTACHMENT
> 
> 1. **Zero Mains Connection While Worn:**  
>    Under **NO circumstances** should the prototype be connected to USB wall adapters, PC USB ports, or mains chargers while the piezoelectric sensor is placed on a human throat or neck.
> 2. **Charging Isolation:**  
>    The LiPo battery may only be charged via the TP4056 micro-USB/USB-C port when the device is completely powered off and physically detached from any participant.
> 3. **Physical Sensor Encapsulation:**  
>    The $27\text{ mm}$ brass disc must be enclosed in a biocompatible silicone housing or covered with medical-grade insulation tape (e.g. 3M Tegaderm or silicone sleeve) to ensure zero direct electrical metallic contact with human skin.
> 4. **Low Voltage Operation:**  
>    The system operates entirely at nominal $3.7\text{V}$ battery power and regulated $3.3\text{V}$ DC logic, well within Safety Extra Low Voltage (SELV) limits.
