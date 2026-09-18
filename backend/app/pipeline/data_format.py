import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

NO_VALID_SWALLOW = "NO_VALID_SWALLOW"

def derive_age_group(age: int) -> str:
    """
    Derives age cohort for demographic auditing.
    Not used to bias clinical thresholds.
    """
    if age < 18:
        return "<18"
    elif age <= 39:
        return "18–39"
    elif age <= 59:
        return "40–59"
    elif age <= 75:
        return "60–75"
    else:
        return "76+"

@dataclass
class SessionMetadata:
    patient_code: str = "P-UNKNOWN"
    age: int = 65
    age_group: str = "60–75"
    sex: Optional[str] = "Prefer not to say"
    sample_rate: float = 50.0  # Hz
    test_type: str = "standard_5ml_water" # 'dry_swallow' | 'standard_5ml_water' | 'free_drink'
    water_volume_ml: float = 5.0
    sensor_position: str = "cricoid_cartilage_lateral_throat" # 27mm piezo lateral, MPU6050 midline
    additional_notes: Optional[str] = None

    def __post_init__(self):
        if not self.age_group:
            self.age_group = derive_age_group(self.age)

@dataclass
class SwallowEvent:
    event_start: float      # ms
    event_end: float        # ms
    event_duration: float   # ms
    detection_confidence: float # 0.0 to 1.0
    piezo_peak_ms: Optional[float] = None
    motion_peak_ms: Optional[float] = None

@dataclass
class TelemetrySession:
    """
    Standardized multi-sensor recording session.
    Holds raw synchronized samples from throat piezo contact mic and MPU6050 IMU.
    """
    timestamp_ms: np.ndarray
    piezo: np.ndarray
    ax: np.ndarray
    ay: np.ndarray
    az: np.ndarray
    gx: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=float))
    gy: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=float))
    gz: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=float))
    metadata: SessionMetadata = field(default_factory=SessionMetadata)

    def __post_init__(self):
        self.timestamp_ms = np.asarray(self.timestamp_ms, dtype=float)
        self.piezo = np.asarray(self.piezo, dtype=float)
        self.ax = np.asarray(self.ax, dtype=float)
        self.ay = np.asarray(self.ay, dtype=float)
        self.az = np.asarray(self.az, dtype=float)

        n = len(self.timestamp_ms)
        if len(self.gx) != n:
            self.gx = np.zeros(n, dtype=float)
        if len(self.gy) != n:
            self.gy = np.zeros(n, dtype=float)
        if len(self.gz) != n:
            self.gz = np.zeros(n, dtype=float)

    @property
    def duration_ms(self) -> float:
        if len(self.timestamp_ms) < 2:
            return 0.0
        return float(self.timestamp_ms[-1] - self.timestamp_ms[0])

    @property
    def sample_count(self) -> int:
        return len(self.timestamp_ms)

    @classmethod
    def from_dict(cls, data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> "TelemetrySession":
        meta = SessionMetadata(**(metadata or {}))
        return cls(
            timestamp_ms=np.array(data.get("timestamp_ms", []), dtype=float),
            piezo=np.array(data.get("piezo", []), dtype=float),
            ax=np.array(data.get("ax", []), dtype=float),
            ay=np.array(data.get("ay", []), dtype=float),
            az=np.array(data.get("az", []), dtype=float),
            gx=np.array(data.get("gx", []), dtype=float),
            gy=np.array(data.get("gy", []), dtype=float),
            gz=np.array(data.get("gz", []), dtype=float),
            metadata=meta
        )
