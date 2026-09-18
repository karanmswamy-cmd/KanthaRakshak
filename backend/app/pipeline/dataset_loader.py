"""
Research Dataset Loading, Column Mapping, and Patient-Wise Splitting Module.

Ensures strict zero-leakage patient-level partitioning (GroupKFold / StratifiedGroupKFold).
"""

import os
import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from app.pipeline.data_format import TelemetrySession, SessionMetadata, derive_age_group
from app.pipeline.event_detection import detect_swallow_event, SwallowEvent
from app.pipeline.feature_extractor import extract_all_features

def generate_synthetic_research_cohort(
    num_patients: int = 40,
    sessions_per_patient: int = 4,
    random_seed: int = 42
) -> List[Dict[str, Any]]:
    """
    Synthesizes a heterogeneous research cohort of swallow recordings
    based on physiological deglutition literature (e.g., Steele et al., Ertekin et al.).

    Simulates:
    - Demographic cohorts: 18-39, 40-59, 60-75, 76+
    - Clinical classes: NORMAL swallows (healthy transit) vs ABNORMAL swallows (delayed/fragmented)
    - Realistic sensor noise and motion artifacts
    - Strict patient ID tags for patient-level cross-validation
    """
    rng = np.random.RandomState(random_seed)
    records = []

    age_pools = [
        ("18–39", (20, 38)),
        ("40–59", (42, 58)),
        ("60–75", (61, 74)),
        ("76+", (77, 89))
    ]

    for p_idx in range(1, num_patients + 1):
        p_code = f"PAT-RES-{p_idx:03d}"
        cohort_name, (min_a, max_a) = age_pools[p_idx % len(age_pools)]
        age = int(rng.randint(min_a, max_a + 1))
        sex = rng.choice(["Male", "Female", "Prefer not to say"], p=[0.48, 0.48, 0.04])

        # Underlying patient condition: ~35% have physiological dysphagia/swallow impairment
        is_impaired_patient = bool(rng.rand() < 0.35)

        for s_idx in range(1, sessions_per_patient + 1):
            session_id = f"{p_code}-S{s_idx:02d}"
            test_type = rng.choice(["standard_5ml_water", "dry_swallow"], p=[0.75, 0.25])
            water_vol = 5.0 if test_type == "standard_5ml_water" else 0.0

            # Determine session label (healthy patients produce mostly normal; impaired produce abnormal or inconsistent)
            if is_impaired_patient:
                label = "ABNORMAL" if rng.rand() < 0.85 else "NORMAL"
            else:
                label = "NORMAL" if rng.rand() < 0.90 else "ABNORMAL"

            # Generate 4-second recording at 50 Hz (200 samples)
            n_samples = 200
            fs = 50.0
            t = np.arange(n_samples) * (1000.0 / fs)

            # Quiescent baseline with respiratory/cardiac tremor
            piezo_noise = rng.normal(0, 0.015, n_samples)
            ax = rng.normal(0, 0.01, n_samples)
            ay = rng.normal(0, 0.01, n_samples)
            az = rng.normal(0.98, 0.015, n_samples) # ~1.0g gravity vector

            # Swallow onset around t = 1.2s to 1.8s
            onset_t = rng.uniform(1200.0, 1800.0)
            onset_idx = int(onset_t / 20.0)

            # Borderline biological variability:
            # - ~10% of normal swallows exhibit mild clearing hesitation or elderly transit delay (false-positive challenge)
            # - ~10% of abnormal swallows exhibit single-burst penetration/silent aspiration (false-negative challenge)
            is_borderline = bool(rng.rand() < 0.10)

            if label == "NORMAL":
                if is_borderline:
                    # Mildly prolonged clearing in healthy elderly subject
                    duration_ms = rng.uniform(950.0, 1250.0)
                    dom_freq = rng.uniform(8.5, 12.0)
                    lag_samples = int(rng.uniform(3, 7)) # 60ms - 140ms
                else:
                    # Typical coordinated burst: duration 550ms - 950ms
                    duration_ms = rng.uniform(550.0, 950.0)
                    dom_freq = rng.uniform(10.0, 16.0)
                    lag_samples = int(rng.uniform(1, 4)) # 20ms - 80ms

                dur_samples = max(10, int(duration_ms / 20.0))
                burst_t = np.linspace(0, 1, dur_samples)
                env = np.sin(np.pi * burst_t) ** 2
                carrier = np.sin(2 * np.pi * dom_freq * (burst_t * (duration_ms / 1000.0)))
                burst_piezo = 0.65 * env * (0.6 + 0.4 * carrier)

                end_idx = min(n_samples, onset_idx + dur_samples)
                piezo_noise[onset_idx:end_idx] += burst_piezo[:end_idx - onset_idx]

                # Hyolaryngeal excursion on MPU6050
                m_onset = min(n_samples - 5, onset_idx + lag_samples)
                m_dur = int(dur_samples * rng.uniform(0.9, 1.1))
                m_end = min(n_samples, m_onset + m_dur)

                motion_t = np.linspace(0, np.pi, m_end - m_onset)
                ax[m_onset:m_end] += 0.25 * np.sin(motion_t)
                az[m_onset:m_end] += 0.15 * np.sin(motion_t)

            else:
                if is_borderline:
                    # Borderline abnormal: single slightly prolonged burst (subtle dysfunction / silent penetration)
                    duration_ms = rng.uniform(1150.0, 1400.0)
                    dom_freq = rng.uniform(8.0, 11.0)
                    lag_samples = int(rng.uniform(4, 9)) # 80ms - 180ms
                    dur_samples = max(20, int(duration_ms / 20.0))

                    burst_t = np.linspace(0, 2 * np.pi, dur_samples)
                    env = np.abs(np.sin(burst_t)) * 0.50
                    carrier = np.sin(2 * np.pi * dom_freq * (np.linspace(0, duration_ms/1000.0, dur_samples)))
                    burst_piezo = env * (0.5 + 0.5 * carrier)
                else:
                    # Manifestly abnormal: prolonged (>1400ms), multiple fragmented bursts, poor synchronization
                    duration_ms = rng.uniform(1400.0, 2250.0)
                    dom_freq = rng.uniform(5.5, 9.0)
                    lag_samples = int(rng.uniform(7, 16)) # 140ms - 320ms delayed laryngeal excursion
                    dur_samples = max(25, int(duration_ms / 20.0))

                    # Multiple fragmented bursts (hesitation, multiple clearing efforts)
                    burst_t = np.linspace(0, 3 * np.pi, dur_samples)
                    env = np.abs(np.sin(burst_t)) * 0.55
                    carrier = np.sin(2 * np.pi * dom_freq * (np.linspace(0, duration_ms/1000.0, dur_samples)))
                    burst_piezo = env * (0.5 + 0.5 * carrier)

                end_idx = min(n_samples, onset_idx + dur_samples)
                piezo_noise[onset_idx:end_idx] += burst_piezo[:end_idx - onset_idx]

                # Dyssynchronous or fragmented motion
                m_onset = min(n_samples - 5, onset_idx + lag_samples)
                m_dur = dur_samples
                m_end = min(n_samples, m_onset + m_dur)

                motion_t = np.linspace(0, 2 * np.pi, m_end - m_onset)
                ax[m_onset:m_end] += 0.35 * np.abs(np.sin(motion_t))
                az[m_onset:m_end] += 0.20 * np.sin(motion_t)

            # Metadata object
            meta = SessionMetadata(
                patient_code=p_code,
                age=age,
                age_group=cohort_name,
                sex=sex,
                sample_rate=fs,
                test_type=test_type,
                water_volume_ml=water_vol,
                sensor_position="cricoid_cartilage_lateral_throat",
                additional_notes=f"Synthetic research session {session_id}"
            )

            session = TelemetrySession(
                timestamp_ms=t,
                piezo=piezo_noise,
                ax=ax,
                ay=ay,
                az=az,
                metadata=meta
            )

            # Extract event and features
            event = detect_swallow_event(session)
            features = extract_all_features(session, event if isinstance(event, SwallowEvent) else None)

            record = {
                "session_id": session_id,
                "patient_code": p_code,
                "age": age,
                "age_group": cohort_name,
                "sex": sex,
                "test_type": test_type,
                "water_volume_ml": water_vol,
                "label": label, # 'NORMAL' or 'ABNORMAL'
                "swallow_detected": bool(isinstance(event, SwallowEvent)),
                **features
            }
            records.append(record)

    return records

def normalize_labels(
    series: pd.Series,
    label_mapping: Optional[Dict[Any, str]] = None
) -> pd.Series:
    """
    Standardizes disparate clinical study labels into canonical 'NORMAL' and 'ABNORMAL'.
    Default mappings support common research annotations (0/1, healthy/dysphagia, etc.).
    """
    default_mapping = {
        # Normal representations
        0: "NORMAL",
        "0": "NORMAL",
        "normal": "NORMAL",
        "healthy": "NORMAL",
        "control": "NORMAL",
        "typical": "NORMAL",
        "non-dysphagic": "NORMAL",
        "NORMAL": "NORMAL",
        # Abnormal representations
        1: "ABNORMAL",
        "1": "ABNORMAL",
        "abnormal": "ABNORMAL",
        "dysphagia": "ABNORMAL",
        "dysphagic": "ABNORMAL",
        "impaired": "ABNORMAL",
        "pathological": "ABNORMAL",
        "aspiration": "ABNORMAL",
        "penetration": "ABNORMAL",
        "ABNORMAL": "ABNORMAL"
    }
    mapping = {**default_mapping, **(label_mapping or {})}
    # Case-insensitive string mapping
    cleaned_series = series.map(lambda x: mapping.get(str(x).lower(), mapping.get(x, "ABNORMAL")))
    return cleaned_series

def map_dataset_columns(
    df: pd.DataFrame,
    column_mapping: Dict[str, str]
) -> pd.DataFrame:
    """
    Maps heterogeneous column nomenclature from public research datasets
    (e.g., PhysioNet, Zenodo, Kaggle swallow acoustic corpora) to canonical pipeline schema.
    """
    mapped_df = df.rename(columns=column_mapping).copy()
    return mapped_df

def load_public_research_dataset(
    file_path: str,
    column_mapping: Optional[Dict[str, str]] = None,
    label_mapping: Optional[Dict[Any, str]] = None
) -> pd.DataFrame:
    """
    Loads and standardizes an external public deglutition research dataset.
    Validates patient identifiers and normalizes target labels.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Research dataset not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext in (".tsv", ".txt"):
        df = pd.read_csv(file_path, sep="\t")
    elif ext == ".json":
        df = pd.read_json(file_path)
    else:
        df = pd.read_csv(file_path)

    if column_mapping:
        df = map_dataset_columns(df, column_mapping)

    if "label" in df.columns:
        df["label"] = normalize_labels(df["label"], label_mapping)

    if "age" in df.columns and "age_group" not in df.columns:
        df["age_group"] = df["age"].apply(lambda a: derive_age_group(int(a)) if pd.notnull(a) else "Unknown")

    if "patient_code" not in df.columns:
        if "patient_id" in df.columns:
            df["patient_code"] = df["patient_id"]
        elif "subject_id" in df.columns:
            df["patient_code"] = df["subject_id"]
        else:
            # Fallback: assign each row unique patient code to avoid accidental false grouping
            df["patient_code"] = [f"EXT-P-{i:04d}" for i in range(len(df))]

    return df

def patient_wise_train_test_split(
    df: pd.DataFrame,
    patient_col: str = "patient_code",
    test_size: float = 0.20,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Partitions dataset strictly at the patient/subject level.
    Guarantees zero data leakage: recordings from any single patient
    reside exclusively in either the training set OR test set.
    """
    if patient_col not in df.columns:
        raise ValueError(f"Patient column '{patient_col}' not found in DataFrame.")

    unique_patients = df[patient_col].unique()
    rng = np.random.RandomState(random_state)
    shuffled_patients = rng.permutation(unique_patients)

    n_test_patients = max(1, int(round(len(unique_patients) * test_size)))
    test_patients = set(shuffled_patients[:n_test_patients])
    train_patients = set(shuffled_patients[n_test_patients:])

    train_df = df[df[patient_col].isin(train_patients)].copy().reset_index(drop=True)
    test_df = df[df[patient_col].isin(test_patients)].copy().reset_index(drop=True)

    # Verification of zero leakage
    overlap = set(train_df[patient_col]).intersection(set(test_df[patient_col]))
    assert len(overlap) == 0, f"Patient leakage detected: {overlap}"

    return train_df, test_df

def load_cohort_dataframe(save_csv_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads or generates research cohort DataFrame.
    """
    records = generate_synthetic_research_cohort(num_patients=40, sessions_per_patient=4)
    df = pd.DataFrame(records)
    if save_csv_path:
        os.makedirs(os.path.dirname(save_csv_path), exist_ok=True)
        df.to_csv(save_csv_path, index=False)
    return df

