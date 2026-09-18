import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.models.base import Base, engine, SessionLocal
from app.models.patient import Patient
from app.models.screening_test import ScreeningTest
from app.schemas.patient import derive_age_group
from app.schemas.sensor import SensorSample
from app.api import patients, tests, device, reports
from app.core.websocket_manager import ws_manager
from app.services.ble_service import ble_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create database schema
    Base.metadata.create_all(bind=engine)

    # 2. Seed default demo patients if empty
    db = SessionLocal()
    try:
        if db.query(Patient).count() == 0:
            demo_patients = [
                Patient(
                    id="PAT-8831",
                    patient_code="JS-8831",
                    name="R. K. (Demo)",
                    age=64,
                    age_group=derive_age_group(64),
                    sex="Male",
                    ward="ICU Bed 04"
                ),
                Patient(
                    id="PAT-6190",
                    patient_code="JS-6190",
                    name="M. S. (Demo)",
                    age=72,
                    age_group=derive_age_group(72),
                    sex="Female",
                    ward="Stroke Unit 12"
                ),
                Patient(
                    id="PAT-2044",
                    patient_code="JS-2044",
                    name="V. A. (Demo)",
                    age=81,
                    age_group=derive_age_group(81),
                    sex="Male",
                    ward="Geriatric Ward 08"
                )
            ]
            db.add_all(demo_patients)
            db.commit()
            print("Database initialized with demo patients.")

        if db.query(ScreeningTest).count() < 3:
            import json
            from datetime import datetime, timedelta
            now = datetime.utcnow()
            demo_tests = [
                ScreeningTest(
                    id="TEST-DEMO-001",
                    patient_id="PAT-8831",
                    started_at=now - timedelta(hours=3),
                    finished_at=now - timedelta(hours=3, seconds=-5),
                    signal_quality="GOOD",
                    noise_level="LOW",
                    piezo_detected=True,
                    motion_detected=True,
                    sensor_agreement="HIGH",
                    swallow_duration=740.0,
                    dominant_frequency=12.5,
                    spectral_peak_count=2,
                    ml_probability=0.12,
                    ml_prediction="NORMAL",
                    rule_result="PASS",
                    final_result="LOW_RISK",
                    explanation_json=json.dumps([
                        "Normal swallow duration (740 ms) within physiological range.",
                        "Strong cross-correlation between 27mm acoustic sensor and MPU6050 hyolaryngeal movement.",
                        "Acoustic spectral distribution matches single coordinated deglutition burst."
                    ])
                ),
                ScreeningTest(
                    id="TEST-DEMO-002",
                    patient_id="PAT-6190",
                    started_at=now - timedelta(hours=12),
                    finished_at=now - timedelta(hours=12, seconds=-5),
                    signal_quality="POOR",
                    noise_level="HIGH",
                    piezo_detected=False,
                    motion_detected=True,
                    sensor_agreement="LOW",
                    swallow_duration=0.0,
                    dominant_frequency=4.0,
                    spectral_peak_count=0,
                    ml_probability=0.45,
                    ml_prediction="INCONCLUSIVE",
                    rule_result="FLAG",
                    final_result="RETEST",
                    explanation_json=json.dumps([
                        "Signal quality was insufficient for reliable biomechanical analysis.",
                        "Excessive baseline acoustic noise detected prior to swallow cue.",
                        "Loose contact or patient head turning caused acoustic flatline."
                    ])
                ),
                ScreeningTest(
                    id="TEST-DEMO-003",
                    patient_id="PAT-2044",
                    started_at=now - timedelta(hours=24),
                    finished_at=now - timedelta(hours=24, seconds=-6),
                    signal_quality="GOOD",
                    noise_level="LOW",
                    piezo_detected=True,
                    motion_detected=True,
                    sensor_agreement="MEDIUM",
                    swallow_duration=1680.0,
                    dominant_frequency=8.2,
                    spectral_peak_count=5,
                    ml_probability=0.88,
                    ml_prediction="ABNORMAL",
                    rule_result="FLAG",
                    final_result="POSSIBLE_RISK",
                    explanation_json=json.dumps([
                        "Prolonged swallow duration (1680 ms) exceeds reference cutoff (1250 ms).",
                        "Fragmented energy spectrum: 5 discrete acoustic bursts indicate fragmented or repetitive swallow efforts.",
                        "Machine learning classifier indicated abnormal acoustic-kinematic signature (probability 88%)."
                    ])
                )
            ]
            db.add_all(demo_tests)
            db.commit()
            print("Database initialized with demo screening tests.")
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend service for KanthaRakshak / JeevaSwara non-invasive swallow screening prototype.",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST endpoints
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(tests.router, prefix=settings.API_V1_STR)
app.include_router(device.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "team": settings.TEAM,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "research_validation_required": True,
        "regulatory_notice": "Screening and decision-support prototype only. Not a diagnostic medical device."
    }

# Real-Time WebSocket for Live Sensor Telemetry
@app.websocket("/ws/live/{test_id}")
async def websocket_live_endpoint(
    websocket: WebSocket,
    test_id: str,
    sim_case: str = Query("normal", description="Simulation case if offline: 'normal', 'noisy', 'abnormal'")
):
    await ws_manager.connect(test_id, websocket)

    async def stream_callback(sample: SensorSample):
        await ws_manager.broadcast_sample(test_id, sample)

    # If client asks to trigger simulated stream or if physical hardware isn't feeding
    simulation_task = None

    try:
        while True:
            # Listen for incoming client messages or control commands
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Client sends incoming sensor sample
                if msg.get("type") == "sensor_data" or "piezo" in msg:
                    sample = SensorSample(
                        timestamp=float(msg.get("timestamp", 0)),
                        piezo=float(msg.get("piezo", 0)),
                        ax=float(msg.get("ax", 0)),
                        ay=float(msg.get("ay", 0)),
                        az=float(msg.get("az", 1)),
                        gx=float(msg.get("gx", 0)),
                        gy=float(msg.get("gy", 0)),
                        gz=float(msg.get("gz", 0)),
                        accel_magnitude=float(msg.get("accel_magnitude", 1.0))
                    )
                    await ws_manager.broadcast_sample(test_id, sample)

                # Client requests simulated streaming replay
                elif msg.get("action") == "start_simulation":
                    case = msg.get("case", sim_case)
                    demo_file = f"{case}_demo.csv"
                    simulation_task = asyncio.create_task(
                        ble_service.start_simulated_stream(demo_file, stream_callback)
                    )

            except Exception as e:
                print(f"WS packet error: {e}")

    except WebSocketDisconnect:
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
        ws_manager.disconnect(test_id, websocket)
