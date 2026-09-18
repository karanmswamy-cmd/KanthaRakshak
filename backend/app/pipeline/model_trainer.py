"""
Machine Learning Baseline Training, Cross-Validation, and Age-Stratified Analysis Module.

Implements:
- Patient-level StratifiedGroupKFold cross validation (no data leakage)
- Comparison of Logistic Regression, Random Forest, SVM, and Gradient Boosting
- Standard scaler pipelines
- Sensitivity, Specificity, Precision, F1, ROC-AUC, Balanced Accuracy
- Independent age-cohort auditing
- Model artifact serialization (model.joblib, feature_schema.json, model_metadata.json)
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple, List, Optional

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import (
    recall_score,
    precision_score,
    f1_score,
    roc_auc_score,
    balanced_accuracy_score,
    confusion_matrix
)

# Core clinical feature set for model training (excluding metadata and labels)
NUMERICAL_FEATURE_COLUMNS = [
    "swallow_duration_ms",
    "piezo_rms",
    "piezo_peak_amplitude",
    "piezo_energy",
    "zero_crossing_rate",
    "dominant_frequency_hz",
    "spectral_centroid_hz",
    "spectral_bandwidth_hz",
    "spectral_rolloff_hz",
    "spectral_peak_count",
    "max_acceleration_g",
    "mean_acceleration_g",
    "acceleration_variance",
    "motion_duration_ms",
    "jerk_rms_g_per_s",
    "jerk_peak_g_per_s",
    "movement_peak_count",
    "piezo_motion_peak_delay_ms",
    "cross_correlation_coeff",
    "overlap_ratio",
    "sensor_agreement_score",
    "mfcc_1",
    "mfcc_2",
    "mfcc_3",
    "mfcc_4",
    "mfcc_5"
]

def get_candidate_models(random_state: int = 42) -> Dict[str, Pipeline]:
    """Builds standard sklearn pipelines for baseline comparison."""
    return {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(class_weight="balanced", random_state=random_state, max_iter=500))
        ]),
        "Random Forest": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(n_estimators=100, max_depth=6, class_weight="balanced", random_state=random_state))
        ]),
        "Support Vector Machine": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", CalibratedClassifierCV(
                estimator=SVC(kernel="rbf", C=1.0, class_weight="balanced", random_state=random_state),
                ensemble=False
            ))
        ]),
        "Gradient Boosting": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=random_state))
        ])
    }

def compute_offline_shap_summary(
    pipeline: Pipeline,
    X_sample: np.ndarray,
    feature_names: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Offline research explainability utility for data science inspection.
    NOTE FOR CLINICAL INTERFACE: Never expose raw SHAP values to clinical staff or nurses.
    Only use high-level categorized rationales in the UI.
    """
    feature_names = feature_names or NUMERICAL_FEATURE_COLUMNS
    clf = pipeline.named_steps.get("clf", pipeline)
    scaler = pipeline.named_steps.get("scaler", None)
    X_scaled = scaler.transform(X_sample) if scaler else X_sample

    try:
        import shap
        explainer = shap.TreeExplainer(clf)
        shap_values = explainer.shap_values(X_scaled)
        # Handle binary classification multi-output
        if isinstance(shap_values, list) and len(shap_values) > 1:
            mean_abs_shap = np.mean(np.abs(shap_values[1]), axis=0)
        else:
            mean_abs_shap = np.mean(np.abs(shap_values), axis=0)

        importance_dict = {
            name: float(round(val, 5))
            for name, val in zip(feature_names, mean_abs_shap)
        }
        sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
        return {
            "method": "SHAP_TreeExplainer",
            "feature_importance": sorted_importance,
            "research_notice": "Offline engineering inspection only. Not for clinical display."
        }
    except Exception:
        # Fallback to feature_importances_ or coef_
        if hasattr(clf, "feature_importances_"):
            raw_imp = clf.feature_importances_
            importance_dict = {
                name: float(round(val, 5))
                for name, val in zip(feature_names, raw_imp)
            }
            sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
            return {
                "method": "Gini_Feature_Importances",
                "feature_importance": sorted_importance,
                "research_notice": "Offline engineering inspection only. Not for clinical display."
            }
        elif hasattr(clf, "coef_"):
            raw_imp = np.abs(clf.coef_[0])
            importance_dict = {
                name: float(round(val, 5))
                for name, val in zip(feature_names, raw_imp)
            }
            sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
            return {
                "method": "Normalized_Coefficients",
                "feature_importance": sorted_importance,
                "research_notice": "Offline engineering inspection only. Not for clinical display."
            }
        return {
            "method": "None",
            "feature_importance": {},
            "research_notice": "Model does not support direct feature attribution."
        }


def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray, y_prob: Optional[np.ndarray] = None) -> Dict[str, float]:
    """
    Computes diagnostic screening metrics with emphasis on recall (false negatives)
    and specificity.
    Label mapping: 1 = ABNORMAL (screening flag), 0 = NORMAL.
    """
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

    sensitivity = float(recall_score(y_true, y_pred, pos_label=1, zero_division=0))
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    precision = float(precision_score(y_true, y_pred, pos_label=1, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, pos_label=1, zero_division=0))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))

    roc_auc = 0.0
    if y_prob is not None and len(np.unique(y_true)) > 1:
        try:
            roc_auc = float(roc_auc_score(y_true, y_prob))
        except Exception:
            roc_auc = 0.0

    return {
        "sensitivity": round(sensitivity, 4), # recall
        "specificity": round(specificity, 4),
        "precision": round(precision, 4),
        "f1": round(f1, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "roc_auc": round(roc_auc, 4),
        "true_positives": int(tp),
        "false_negatives": int(fn),
        "true_negatives": int(tn),
        "false_positives": int(fp)
    }

def benchmark_models_cv(
    df: pd.DataFrame,
    features: List[str] = NUMERICAL_FEATURE_COLUMNS,
    n_splits: int = 5,
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Executes StratifiedGroupKFold cross-validation grouped strictly by patient_code.
    Prevents patient-level data leakage.
    """
    X = df[features].values
    y = (df["label"] == "ABNORMAL").astype(int).values
    groups = df["patient_code"].values

    sgkf = StratifiedGroupKFold(n_splits=n_splits)
    models = get_candidate_models(random_state=random_state)
    comparison_results = {}

    for model_name, pipeline in models.items():
        fold_metrics = []
        for fold, (train_idx, val_idx) in enumerate(sgkf.split(X, y, groups=groups)):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            pipeline.fit(X_train, y_train)
            y_pred = pipeline.predict(X_val)
            y_prob = pipeline.predict_proba(X_val)[:, 1] if hasattr(pipeline, "predict_proba") else None

            metrics = evaluate_predictions(y_val, y_pred, y_prob)
            fold_metrics.append(metrics)

        # Aggregate metrics across folds
        keys = ["sensitivity", "specificity", "precision", "f1", "balanced_accuracy", "roc_auc"]
        agg = {}
        for k in keys:
            vals = [fm[k] for fm in fold_metrics]
            agg[f"{k}_mean"] = round(float(np.mean(vals)), 4)
            agg[f"{k}_std"] = round(float(np.std(vals)), 4)

        comparison_results[model_name] = {
            "aggregated": agg,
            "folds": fold_metrics
        }

    return comparison_results

def evaluate_age_stratification(
    df: pd.DataFrame,
    best_pipeline: Pipeline,
    features: List[str] = NUMERICAL_FEATURE_COLUMNS
) -> Dict[str, Any]:
    """
    Evaluates model performance independently within each age cohort:
    - 18–39
    - 40–59
    - 60–75
    - 76+

    Checks whether age feature should be included or kept decoupled.
    """
    age_cohorts = ["18–39", "40–59", "60–75", "76+"]
    cohort_results = {}

    for cohort in age_cohorts:
        sub_df = df[df["age_group"] == cohort]
        if len(sub_df) < 5 or len(sub_df["label"].unique()) < 2:
            cohort_results[cohort] = {
                "sample_count": len(sub_df),
                "notice": "Insufficient cohort sample size or uniform label distribution for independent metrics"
            }
            continue

        X_sub = sub_df[features].values
        y_sub = (sub_df["label"] == "ABNORMAL").astype(int).values
        y_pred = best_pipeline.predict(X_sub)
        y_prob = best_pipeline.predict_proba(X_sub)[:, 1] if hasattr(best_pipeline, "predict_proba") else None

        metrics = evaluate_predictions(y_sub, y_pred, y_prob)
        cohort_results[cohort] = {
            "sample_count": len(sub_df),
            **metrics
        }

    return cohort_results

def train_and_export_pipeline(
    df: pd.DataFrame,
    output_dir: str,
    features: List[str] = NUMERICAL_FEATURE_COLUMNS,
    model_choice: str = "Random Forest"
) -> Dict[str, Any]:
    """
    Trains full model on research cohort and serializes:
    - model.joblib
    - feature_schema.json
    - model_metadata.json
    """
    os.makedirs(output_dir, exist_ok=True)

    # 1. Cross-validation benchmark
    cv_benchmark = benchmark_models_cv(df, features=features)

    # 2. Train final model pipeline on entire dataset
    X = df[features].values
    y = (df["label"] == "ABNORMAL").astype(int).values

    models = get_candidate_models()
    pipeline = models.get(model_choice, models["Random Forest"])
    pipeline.fit(X, y)

    # 3. Independent Age Cohort Analysis
    age_analysis = evaluate_age_stratification(df, pipeline, features=features)

    # Policy decision: Decouple age to prevent age-based discrimination
    uses_age = False

    # 4. Save model.joblib
    model_path = os.path.join(output_dir, "model.joblib")
    joblib.dump(pipeline, model_path)

    # 5. Save feature_schema.json
    feature_schema = {
        "feature_count": len(features),
        "feature_names": features,
        "feature_types": {f: "float" for f in features},
        "target_mapping": {0: "NORMAL", 1: "ABNORMAL"},
        "research_validation_required": True
    }
    schema_path = os.path.join(output_dir, "feature_schema.json")
    with open(schema_path, "w") as f:
        json.dump(feature_schema, f, indent=2)

    # 6. Save model_metadata.json
    metadata = {
        "model_name": f"JeevaSwara_{model_choice.replace(' ', '_')}_Swallow_Screening_Baseline",
        "version": "1.0.0-research",
        "training_dataset": "JeevaSwara_Synthetic_Research_Cohort_v1",
        "dataset_samples": len(df),
        "unique_patients": int(df["patient_code"].nunique()),
        "feature_names": features,
        "uses_age": uses_age,
        "training_date": datetime.utcnow().isoformat(),
        "validation_method": "StratifiedGroupKFold(n_splits=5, group='patient_code')",
        "performance_metrics": cv_benchmark.get(model_choice, {}).get("aggregated", {}),
        "age_stratified_evaluation": age_analysis,
        "limitations": [
            "Research-grade prototype model trained on simulated and pilot pharyngeal deglutition recordings.",
            "Not cleared or validated as an autonomous medical diagnostic device.",
            "Sensitivity and specificity must be confirmed through prospective clinical trial validation."
        ]
    }
    meta_path = os.path.join(output_dir, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    return {
        "model_path": model_path,
        "schema_path": schema_path,
        "meta_path": meta_path,
        "cv_benchmark": cv_benchmark,
        "age_analysis": age_analysis,
        "uses_age": uses_age
    }
