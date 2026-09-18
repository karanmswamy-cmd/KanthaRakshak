# KanthaRakshak Backend Service

> **Non-Invasive Cervical Swallow-Screening Decision Support Prototype**  
> *Tagline:* **Every Swallow Counts**  
> *Lineage:* Developed by **Team SunForge** (Project *JeevaSwara*)

---

## Important Clinical & Regulatory Notice

> [!CAUTION]
> **KanthaRakshak is an experimental early-screening and decision-support prototype. It is NOT a diagnostic medical device.**
> 
> - It does **not** diagnose dysphagia or confirm pulmonary aspiration.
> - The output is strictly categorized into one of three screening risk levels:
>   1. **`LOW_RISK`** — Swallowing acoustics and laryngeal motion fall within expected normal physiological limits.
>   2. **`RETEST`** (or `RETEST / INCONCLUSIVE`) — Artifacts, high baseline noise, flatline, or sensor discrepancy prevented reliable evaluation.
>   3. **`POSSIBLE_RISK`** — Concerning biomechanical or acoustic deviations detected; **formal specialist referral (SLP / FEES / VFSS) is strongly recommended**.
> - All physiological reference cutoffs are labeled with `RESEARCH_VALIDATION_REQUIRED = True` and represent investigative parameters subject to ongoing clinical trials.

---

## System Architecture

```
                                  +---------------------------------------+
                                  | 27mm Piezo Sensor + MPU6050 Accelerometer
                                  +---------------------------------------+
                                                     |
                                                     v (BLE GATT / CSV Replay)
                                  +---------------------------------------+
                                  |       Bleak / Sim Service             |
                                  +---------------------------------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  |         QualityService                |
                                  |  (Flatline, Clipping, Noise, Jerk)   |
                                  +---------------------------------------+
                                        /                       \
                         [POOR Signal] /                         \ [GOOD / FAIR]
                                      v                           v
                           +--------------------+      +-----------------------+
                           |  RETEST Decision   |      |   SignalService       |
                           +--------------------+      | (Moving Avg FIR, Env) |
                                                       +-----------------------+
                                                                  |
                                                                  v
                                                       +-----------------------+
                                                       |   FeatureService      |
                                                       | (Duration, FFT, Delay)|
                                                       +-----------------------+
                                                                  |
                                                                  v
                                                       +-----------------------+
                                                       | SensorAgreementService|
                                                       |  (Lag & Cross-Corr)   |
                                                       +-----------------------+
                                                             /          \
                                              [LOW Agreement]            [HIGH / MED]
                                                           /              \
                                                          v                v
                                               +------------------+  +--------------------+
                                               | RETEST Decision  |  | DecisionEngine     |
                                               +------------------+  | (RuleEngine + ML)  |
                                                                     +--------------------+
                                                                               |
                                                                      +--------+--------+
                                                                      |                 |
                                                                      v                 v
                                                                 [LOW_RISK]    [POSSIBLE_RISK]
```

---

## Key Technical Specifications

- **Framework**: Python 3.12+ / FastAPI / Uvicorn (ASGI)
- **Data Persistence**: SQLAlchemy ORM with SQLite database (`data/jeevaswara.db`)
- **Telemetry Protocol**: Real-time WebSockets (`/ws/live/{test_id}`) streaming 50 Hz dual-sensor frames
- **Mathematical & DSP Engine**: **Pure-NumPy implementation** of moving-average FIR bandpass filtering, envelope detection, windowed energy calculations, and FFT spectral decomposition (engineered to bypass host OS C-extension AppLocker constraints).
- **Machine Learning**: Pre-trained parametric classifier (`swallow_risk_model.joblib`) with calibrated logistic sigmoid activation over 6 acoustic-biomechanical features.
- **Reporting**: ReportLab PDF generator (`GET /api/reports/{test_id}?format=pdf`) generating archival clinical decision-support summaries with mandatory regulatory notices.

---

## Directory Structure

```
backend/
├── app/
│   ├── api/                     # REST API routers
│   │   ├── patients.py          # Patient registration and demographic endpoints
│   │   ├── tests.py             # Screening test lifecycle (start, finish, query)
│   │   ├── device.py            # Hardware BLE status and telemetry diagnostics
│   │   └── reports.py           # Structured JSON and ReportLab PDF reports
│   ├── core/
│   │   ├── config.py            # App settings (Pydantic SettingsConfigDict)
│   │   ├── reference_thresholds.yaml # Research parameters & physiological cutoffs
│   │   └── websocket_manager.py # WebSocket room & telemetry multiplexer
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── base.py
│   │   ├── patient.py           # Patient demographics (age, age group, ward)
│   │   ├── screening_test.py    # Test results, quality, features, decisions
│   │   └── sensor_session.py    # Raw telemetry sample arrays
│   ├── schemas/                 # Pydantic v2 schemas
│   │   ├── patient.py
│   │   ├── test.py
│   │   └── sensor.py
│   ├── services/                # Clinical DSP, ML & Hardware services
│   │   ├── ble_service.py       # Bleak BLE GATT client & offline CSV simulator
│   │   ├── quality_service.py   # Signal integrity assessment (GOOD, FAIR, POOR)
│   │   ├── signal_service.py    # Pure-NumPy FIR filtering & envelope detection
│   │   ├── feature_service.py   # Temporal, kinematic & spectral FFT extraction
│   │   ├── sensor_agreement.py  # Modality cross-correlation & delay verification
│   │   ├── rule_engine.py       # Deterministic physiological bounding rules
│   │   ├── ml_service.py        # Machine learning inference & feature scoring
│   │   ├── decision_engine.py   # Conservative hierarchical 3-state synthesis
│   │   └── report_service.py    # ReportLab PDF generation
│   ├── tests/                   # Pytest test suite (18 unit tests)
│   │   ├── test_age_group.py
│   │   ├── test_agreement.py
│   │   ├── test_decision_pipeline.py
│   │   ├── test_features.py
│   │   ├── test_quality.py
│   │   └── test_rule_engine.py
│   ├── data/                    # Synthetic CSV playback sessions
│   │   ├── normal_demo.csv      # Typical synchronized swallow (720 ms)
│   │   ├── noisy_demo.csv       # High-noise / motion artifact session
│   │   └── abnormal_demo.csv    # Prolonged, fragmented swallow (1650 ms)
│   └── main.py                  # FastAPI application entrypoint & seeding
├── requirements.txt
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Python 3.12+ (or Python 3.14 on Windows)
- Node.js & npm (for frontend dashboard)

### 2. Environment Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Running the Test Suite
```powershell
.\.venv\Scripts\python.exe -m pytest app/tests/ -v
```
*Expected: 18 passed in ~0.4 seconds.*

### 4. Starting the Backend Server
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
- Alternative API Documentation (ReDoc): `http://localhost:8000/redoc`

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Operational heartbeat, team lineage, and regulatory notice |
| `GET` | `/api/patients` | List all registered patients with age stratification |
| `POST` | `/api/patients` | Register a new patient |
| `GET` | `/api/tests` | Query historical screening records |
| `POST` | `/api/tests/start` | Initialize a new live screening session |
| `POST` | `/api/tests/{test_id}/finish` | Complete screening and execute decision synthesis |
| `GET` | `/api/reports/{test_id}` | Retrieve structured clinical explainability report |
| `GET` | `/api/reports/{test_id}?format=pdf` | Generate downloadable ReportLab PDF summary |
| `GET` | `/api/device/status` | Hardware battery, packet rate, and sensor readiness |
| `WS` | `/ws/live/{test_id}` | Real-time dual-sensor telemetry streaming |

---

## WebSocket Telemetry Protocol

Connect to `ws://localhost:8000/ws/live/{test_id}`.

### Trigger Simulated Offline Stream
```json
{
  "action": "start_simulation",
  "case": "normal" // options: "normal", "noisy", "abnormal"
}
```

### Streamed Dual-Sensor Frame
```json
{
  "type": "sensor_data",
  "timestamp": 1250.0,
  "piezo": 0.452,
  "ax": 0.082,
  "ay": -0.015,
  "az": 0.981,
  "gx": 1.2,
  "gy": -0.8,
  "gz": 0.4,
  "accel_magnitude": 0.985
}
```

---

## Age Stratification Policy
In compliance with ethical AI and medical decision-support principles:
- Patient age is categorized into 5 cohorts: `<18`, `18–39`, `40–59`, `60–75`, `76+`.
- **Age group is retained exclusively for clinical context, retrospective auditing, and clinical trial research.**
- Swallowing decision thresholds are **not** altered arbitrarily based on age, preventing biased misclassification of older adults.
