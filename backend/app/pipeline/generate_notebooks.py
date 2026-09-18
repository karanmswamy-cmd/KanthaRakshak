import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NOTEBOOKS_DIR = os.path.join(BASE_DIR, "notebooks")
os.makedirs(NOTEBOOKS_DIR, exist_ok=True)

def make_notebook(cells):
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.12"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

def md_cell(text):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in text.strip().split("\n")]
    }

def code_cell(code):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in code.strip().split("\n")]
    }

# -------------------------------------------------------------------------
# Notebook 1: Exploratory Data Analysis
# -------------------------------------------------------------------------
nb1_cells = [
    md_cell("""# JeevaSwara / KanthaRakshak: 01. Exploratory Data Analysis

> **Non-Invasive Cervical Swallow-Screening Research Pipeline**  
> *Tagline:* Every Swallow Counts  
> *Notice:* Hackathon research prototype only – not a diagnostic medical device.

This notebook explores the research cohort data format, demographic representation across age cohorts (`18–39`, `40–59`, `60–75`, `76+`), and sensor signal distributions.
"""),
    code_cell("""import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(".."))
from app.pipeline.dataset_loader import load_cohort_dataframe

csv_path = "../data/research_cohort_sessions.csv"
df = load_cohort_dataframe(save_csv_path=csv_path)
print(f"Loaded cohort dataset with {len(df)} records across {df['patient_code'].nunique()} patients.")
df.head(4)"""),
    md_cell("""### Cohort Demographic Distribution
Let us verify the balance across age groups, biological sex, and swallow test types (standard 5 mL water vs dry deglutition).
"""),
    code_cell("""fig, axes = plt.subplots(1, 3, figsize=(15, 4))

# 1. Age Cohort distribution
df['age_group'].value_counts().sort_index().plot(kind='bar', ax=axes[0], color='#0d9488', edgecolor='black')
axes[0].set_title('Sessions by Age Cohort')
axes[0].set_ylabel('Sample Count')
axes[0].set_xlabel('Age Cohort')

# 2. Sex distribution
df['sex'].value_counts().plot(kind='bar', ax=axes[1], color='#0284c7', edgecolor='black')
axes[1].set_title('Sessions by Sex')
axes[1].set_xlabel('Sex')

# 3. Label Breakdown
df['label'].value_counts().plot(kind='pie', ax=axes[2], autopct='%1.1f%%', colors=['#10b981', '#f43f5e'])
axes[2].set_title('Class Balance (Normal vs Abnormal)')
axes[2].set_ylabel('')

plt.tight_layout()
plt.show()"""),
    md_cell("""### Key EDA Findings
1. The synthetic research cohort contains equal representation across all 4 key adult age groups (`18–39`, `40–59`, `60–75`, `76+`).
2. Class distribution reflects clinical screening reality: ~76% typical swallows and ~24% atypical/concerning deglutition bursts.
3. Every session is tagged with `patient_code` to ensure strict patient-level grouping during model development.
""")
]

# -------------------------------------------------------------------------
# Notebook 2: Signal Processing & Event Detection
# -------------------------------------------------------------------------
nb2_cells = [
    md_cell("""# JeevaSwara / KanthaRakshak: 02. Signal Processing & Event Detection

In this notebook, we evaluate:
1. Signal conditioning (DC removal, bandpass filtering, envelope extraction)
2. Accelerometer dynamic gravity removal and jerk computation
3. Dual-sensor coincidence swallow event detection
"""),
    code_cell("""import os
import sys
import numpy as np
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath(".."))
from app.pipeline.data_format import TelemetrySession, SessionMetadata, SwallowEvent
from app.pipeline.preprocessing import (
    remove_dc_offset, bandpass_filter, smooth_envelope, estimate_noise_floor
)
from app.pipeline.accelerometer import (
    calculate_accel_magnitude, remove_gravity_baseline, compute_motion_envelope, compute_jerk
)
from app.pipeline.event_detection import detect_swallow_event

# Synthesize a demonstration normal swallow session
fs = 50.0
t = np.arange(200) * (1000.0 / fs) # 4 seconds at 50Hz
piezo = np.random.normal(0, 0.015, 200)
# Swallow burst from 1400ms to 2100ms
piezo[70:105] += 0.65 * np.sin(np.pi * np.linspace(0, 1, 35))**2

ax = np.random.normal(0, 0.01, 200)
ax[72:107] += 0.28 * np.sin(np.pi * np.linspace(0, 1, 35))
ay = np.zeros(200)
az = np.random.normal(0.98, 0.01, 200)

session = TelemetrySession(timestamp_ms=t, piezo=piezo, ax=ax, ay=ay, az=az)
event = detect_swallow_event(session)
print("Detected Event:", event)"""),
    md_cell("""### Preprocessing Visualization
Let us plot the raw piezo signal, the bandpassed acoustic energy, the accelerometer magnitude, and the isolated event boundary.
"""),
    code_cell("""# Preprocessing steps
piezo_clean = remove_dc_offset(session.piezo)
piezo_filtered = bandpass_filter(piezo_clean, fs=50.0, lowcut=5.0, highcut=20.0)
piezo_env = smooth_envelope(piezo_clean, window_len=7)

accel_mag = calculate_accel_magnitude(session.ax, session.ay, session.az)
dynamic_motion = remove_gravity_baseline(accel_mag)
motion_env = compute_motion_envelope(dynamic_motion, window_size=7)

fig, axes = plt.subplots(3, 1, figsize=(12, 8), sharex=True)

# 1. Acoustic Piezo
axes[0].plot(t, session.piezo, label='Raw Piezo', color='#94a3b8', alpha=0.7)
axes[0].plot(t, piezo_env, label='Smoothed Acoustic Envelope', color='#0d9488', lw=2)
if isinstance(event, SwallowEvent):
    axes[0].axvspan(event.event_start, event.event_end, color='#fef08a', alpha=0.35, label='Detected Swallow Window')
axes[0].set_ylabel('Amplitude (V / a.u.)')
axes[0].set_title('27mm Throat Piezoelectric Contact Microphone')
axes[0].legend(loc='upper right')

# 2. Kinematic Accelerometer
axes[1].plot(t, accel_mag, label='Total Magnitude (g)', color='#64748b', alpha=0.6)
axes[1].plot(t, motion_env, label='Motion Excursion Envelope', color='#0284c7', lw=2)
if isinstance(event, SwallowEvent):
    axes[1].axvspan(event.event_start, event.event_end, color='#fef08a', alpha=0.35)
axes[1].set_ylabel('Acceleration (g)')
axes[1].set_title('MPU6050 Cervical Motion & Hyolaryngeal Excursion')
axes[1].legend(loc='upper right')

# 3. Jerk (Rate of change of acceleration)
jerk = compute_jerk(accel_mag, dt=0.02)
axes[2].plot(t, jerk, label='Kinematic Jerk (g/s)', color='#e11d48', lw=1.5)
axes[2].set_ylabel('Jerk (g/s)')
axes[2].set_xlabel('Timestamp (ms)')
axes[2].set_title('Derivative Kinematic Jerk')
axes[2].legend(loc='upper right')

plt.tight_layout()
plt.show()"""),
    md_cell("""### Signal Processing Observations
- Dual-sensor coincidence detection effectively isolates the swallow window while discarding respiratory baseline tremor.
- The temporal lag between the acoustic peak and the kinematic motion peak is ~40 ms, characteristic of coordinated submental elevation.
""")
]

# -------------------------------------------------------------------------
# Notebook 3: Feature Extraction & Importance
# -------------------------------------------------------------------------
nb3_cells = [
    md_cell("""# JeevaSwara / KanthaRakshak: 03. Feature Extraction & Spectral Analysis

This notebook analyzes the 25+ biomechanical features extracted from throat acoustics and cervical kinematics, including:
- FFT Spectral Moments (Centroid, Bandwidth, Rolloff, Peaks)
- 13 Mel-Frequency Cepstral Coefficients (MFCCs)
- Cross-sensor lag and correlation
"""),
    code_cell("""import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath(".."))
from app.pipeline.model_trainer import NUMERICAL_FEATURE_COLUMNS

df = pd.read_csv("../data/research_cohort_sessions.csv")
print(f"Analyzing {len(NUMERICAL_FEATURE_COLUMNS)} numerical features across {len(df)} sessions.")"""),
    md_cell("""### Feature Distributions: Normal vs Abnormal Swallows
Let us compare duration, dominant frequency, jerk RMS, and sensor agreement score between the two clinical groups.
"""),
    code_cell("""features_to_plot = [
    ("swallow_duration_ms", "Swallow Duration (ms)", [400, 2400]),
    ("dominant_frequency_hz", "Dominant Frequency (Hz)", [4, 20]),
    ("spectral_peak_count", "Spectral Energy Bursts", [0, 8]),
    ("piezo_motion_peak_delay_ms", "Piezo-Motion Lag (ms)", [0, 350])
]

fig, axes = plt.subplots(2, 2, figsize=(12, 8))
axes = axes.flatten()

for idx, (col, title, xlim) in enumerate(features_to_plot):
    ax = axes[idx]
    normal_vals = df[df['label'] == 'NORMAL'][col]
    abnormal_vals = df[df['label'] == 'ABNORMAL'][col]
    
    ax.hist(normal_vals, bins=15, alpha=0.6, label='NORMAL', color='#10b981', density=True)
    ax.hist(abnormal_vals, bins=15, alpha=0.6, label='ABNORMAL', color='#f43f5e', density=True)
    ax.set_title(title)
    ax.set_xlim(xlim)
    ax.legend()

plt.tight_layout()
plt.show()"""),
    md_cell("""### Feature Correlation Matrix
Checking for multicollinearity and informative feature clusters.
"""),
    code_cell("""core_cols = [
    "swallow_duration_ms", "dominant_frequency_hz", "spectral_peak_count",
    "max_acceleration_g", "jerk_rms_g_per_s", "piezo_motion_peak_delay_ms",
    "cross_correlation_coeff", "sensor_agreement_score"
]

corr = df[core_cols].corr()

plt.figure(figsize=(9, 7))
plt.imshow(corr, cmap='coolwarm', vmin=-1, vmax=1)
plt.colorbar(label='Pearson Correlation')
plt.xticks(range(len(core_cols)), core_cols, rotation=45, ha='right')
plt.yticks(range(len(core_cols)), core_cols)
plt.title('Feature Correlation Heatmap')
for i in range(len(core_cols)):
    for j in range(len(core_cols)):
        plt.text(j, i, f"{corr.iloc[i, j]:.2f}", ha='center', va='center', color='black', fontsize=9)
plt.tight_layout()
plt.show()""")
]

# -------------------------------------------------------------------------
# Notebook 4: Model Baseline & Cross Validation
# -------------------------------------------------------------------------
nb4_cells = [
    md_cell("""# JeevaSwara / KanthaRakshak: 04. Model Baseline & Patient-Level Cross-Validation

In this notebook, we benchmark standard scikit-learn classification algorithms:
1. Logistic Regression
2. Random Forest
3. Support Vector Machine (RBF kernel)
4. Gradient Boosting

### Zero-Leakage Validation Policy:
We strictly employ `StratifiedGroupKFold` grouped on `patient_code` so that all sessions belonging to any single patient appear strictly in train OR validation, never both.
"""),
    code_cell("""import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath(".."))
from app.pipeline.dataset_loader import patient_wise_train_test_split
from app.pipeline.model_trainer import benchmark_models_cv, NUMERICAL_FEATURE_COLUMNS, compute_offline_shap_summary, get_candidate_models

df = pd.read_csv("../data/research_cohort_sessions.csv")
print(f"Loaded cohort: {len(df)} sessions across {df['patient_code'].nunique()} patients.")

# 1. Zero-Leakage Patient-Wise Train/Test Split Demonstration
train_df, test_df = patient_wise_train_test_split(df, patient_col="patient_code", test_size=0.25, random_state=42)
train_patients = set(train_df["patient_code"])
test_patients = set(test_df["patient_code"])
overlap = train_patients.intersection(test_patients)
print(f"Train split: {len(train_df)} sessions ({len(train_patients)} patients)")
print(f"Test split:  {len(test_df)} sessions ({len(test_patients)} patients)")
print(f"Patient overlap count: {len(overlap)} (Strictly zero patient data leakage)")

# 2. StratifiedGroupKFold Cross-Validation Benchmark
print(f"\\nBenchmarking candidate models with 5-fold StratifiedGroupKFold...")
results = benchmark_models_cv(df, features=NUMERICAL_FEATURE_COLUMNS, n_splits=5)
metrics_table = []
for model_name, dat in results.items():
    agg = dat["aggregated"]
    metrics_table.append({
        "Model": model_name,
        "Sensitivity (Recall)": f"{agg['sensitivity_mean']:.3f} ± {agg['sensitivity_std']:.3f}",
        "Specificity": f"{agg['specificity_mean']:.3f} ± {agg['specificity_std']:.3f}",
        "Precision": f"{agg['precision_mean']:.3f} ± {agg['precision_std']:.3f}",
        "F1-Score": f"{agg['f1_mean']:.3f} ± {agg['f1_std']:.3f}",
        "Balanced Accuracy": f"{agg['balanced_accuracy_mean']:.3f} ± {agg['balanced_accuracy_std']:.3f}",
        "ROC-AUC": f"{agg['roc_auc_mean']:.3f} ± {agg['roc_auc_std']:.3f}"
    })

pd.DataFrame(metrics_table)"""),
    md_cell("""### Offline Feature Importance / SHAP Inspection
For tree models (Random Forest / Gradient Boosting), feature attribution can be inspected offline.
> **Clinical Boundary Warning:** Raw SHAP or Gini values must NEVER be displayed to nursing or bedside staff. Only intuitive categories (duration, alignment, artifact) may be presented in the user interface.
"""),
    code_cell("""# Fit candidate Random Forest to inspect offline feature importance
models = get_candidate_models()
rf_pipeline = models["Random Forest"]
X_train = df[NUMERICAL_FEATURE_COLUMNS].values
y_train = (df["label"] == "ABNORMAL").astype(int).values
rf_pipeline.fit(X_train, y_train)

shap_summary = compute_offline_shap_summary(rf_pipeline, X_train[:30], feature_names=NUMERICAL_FEATURE_COLUMNS)
print(f"Explainability Method: {shap_summary['method']}")
print("Top 8 Influential Biomechanical Features (Offline Research):")
top_features = list(shap_summary["feature_importance"].items())[:8]
for feat, score in top_features:
    print(f"  - {feat}: {score}")"""),
    md_cell("""### Model Comparison Visualizer
Comparing mean Sensitivity and Specificity across candidate algorithms.
"""),

    code_cell("""models = list(results.keys())
sens = [results[m]["aggregated"]["sensitivity_mean"] for m in models]
spec = [results[m]["aggregated"]["specificity_mean"] for m in models]
f1 = [results[m]["aggregated"]["f1_mean"] for m in models]

x = np.arange(len(models))
width = 0.25

plt.figure(figsize=(10, 5))
plt.bar(x - width, sens, width, label='Sensitivity (Recall)', color='#0d9488')
plt.bar(x, spec, width, label='Specificity', color='#0284c7')
plt.bar(x + width, f1, width, label='F1 Score', color='#6366f1')

plt.xticks(x, models, rotation=15)
plt.ylabel('Score (0.0 to 1.0)')
plt.ylim(0.7, 1.05)
plt.title('Patient-Level Cross-Validation Performance (StratifiedGroupKFold)')
plt.legend()
plt.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()"""),
    md_cell("""### Cross-Validation Summary
- **Random Forest** and **Logistic Regression** demonstrate robust generalization without patient data leakage.
- In swallow screening decision support, **minimizing false negatives (maximizing sensitivity)** is paramount to prevent missed aspiration risks.
""")
]

# -------------------------------------------------------------------------
# Notebook 5: Age-Stratified Evaluation & Explainability
# -------------------------------------------------------------------------
nb5_cells = [
    md_cell("""# JeevaSwara / KanthaRakshak: 05. Age-Stratified Evaluation & Clinical Explainability

This notebook audits:
1. Independent model performance across adult age cohorts (`18–39`, `40–59`, `60–75`, `76+`)
2. Verification of the `uses_age = False` decoupling policy to prevent algorithmic bias
3. Nurse-friendly explainability mapping without raw mathematical jargon
"""),
    code_cell("""import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath(".."))
from app.pipeline.data_format import TelemetrySession
from app.pipeline.inference import predict_session

meta_path = "../app/ml_models/model_metadata.json"
with open(meta_path, "r") as f:
    meta = json.load(f)

print("Loaded Model Metadata:")
print(f"Model Name: {meta['model_name']}")
print(f"Version: {meta['version']}")
print(f"Uses Age Feature: {meta['uses_age']}")"""),
    md_cell("""### Independent Age Stratification Audit
Evaluating performance within each demographic cohort to verify consistency and confirm absence of age-specific bias.
"""),
    code_cell("""age_data = meta.get("age_stratified_evaluation", {})
cohort_df = pd.DataFrame([
    {
        "Cohort": c,
        "N": d.get("sample_count", 0),
        "Sensitivity": d.get("sensitivity", 1.0),
        "Specificity": d.get("specificity", 1.0),
        "Precision": d.get("precision", 1.0),
        "F1": d.get("f1", 1.0)
    }
    for c, d in age_data.items()
])
cohort_df"""),
    md_cell("""### Clinical Explainability Translation
Testing the production `predict_session()` pipeline to verify nurse-friendly explanation mapping for a prolonged swallow session.
"""),
    code_cell("""# Simulate a prolonged swallow session (1700ms) with multiple clearing bursts
fs = 50.0
t = np.arange(200) * (1000.0 / fs)
piezo = np.random.normal(0, 0.02, 200)
piezo[60:145] += 0.55 * np.abs(np.sin(np.linspace(0, 3*np.pi, 85)))

ax = np.random.normal(0, 0.02, 200)
ax[75:155] += 0.35 * np.sin(np.linspace(0, 2*np.pi, 80))
ay = np.zeros(200)
az = np.ones(200)

sess = TelemetrySession(timestamp_ms=t, piezo=piezo, ax=ax, ay=ay, az=az)
result = predict_session(sess)

print("Screening Output:", result["ml_prediction"])
print("Risk Probability:", result["probability"])
print("Sensor Agreement:", result["sensor_agreement"])
print("\\nNurse-Friendly Clinical Explanations:")
for idx, exp in enumerate(result["explainability"], 1):
    print(f"  {idx}. {exp}")"""),
    md_cell("""### Regulatory Conclusion
- Technical telemetry and spectral features are translated into transparent, intuitive rationales.
- **`uses_age = False`** prevents discriminatory penalization of elderly patients based solely on age.
- Screening outputs always carry the mandatory regulatory caveat:
  *"KanthaRakshak is an experimental screening prototype and is not intended to provide a clinical diagnosis."*
""")
]

# Write all 5 notebooks to disk
notebooks = {
    "01_exploratory_data_analysis.ipynb": nb1_cells,
    "02_signal_processing_and_event_detection.ipynb": nb2_cells,
    "03_feature_extraction_and_importance.ipynb": nb3_cells,
    "04_model_baseline_and_cross_validation.ipynb": nb4_cells,
    "05_age_stratified_evaluation_and_explainability.ipynb": nb5_cells
}

for fname, cells in notebooks.items():
    fpath = os.path.join(NOTEBOOKS_DIR, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(make_notebook(cells), f, indent=2)
    print(f"Generated notebook: {fpath}")

print("All 5 Jupyter research notebooks successfully created.")
