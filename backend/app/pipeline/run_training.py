import os
import sys

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from app.pipeline.dataset_loader import load_cohort_dataframe
from app.pipeline.model_trainer import train_and_export_pipeline

def main():
    print("Generating synthetic research cohort (40 patients, 160 sessions)...")
    csv_path = os.path.join(BASE_DIR, "data", "research_cohort_sessions.csv")
    df = load_cohort_dataframe(save_csv_path=csv_path)
    print(f"Cohort generated: {len(df)} sessions from {df['patient_code'].nunique()} unique patients.")
    print(f"Cohort label breakdown: {df['label'].value_counts().to_dict()}")

    output_dir = os.path.join(BASE_DIR, "app", "ml_models")
    print("\nExecuting StratifiedGroupKFold benchmark & training artifacts...")
    res = train_and_export_pipeline(df, output_dir=output_dir, model_choice="Random Forest")

    print("\n=================== BENCHMARK RESULTS ===================")
    for model_name, dat in res["cv_benchmark"].items():
        agg = dat["aggregated"]
        print(f"Model: {model_name}")
        print(f"  Sensitivity (Recall): {agg['sensitivity_mean']} +/- {agg['sensitivity_std']}")
        print(f"  Specificity:          {agg['specificity_mean']} +/- {agg['specificity_std']}")
        print(f"  Precision:            {agg['precision_mean']} +/- {agg['precision_std']}")
        print(f"  F1-Score:             {agg['f1_mean']} +/- {agg['f1_std']}")
        print(f"  Balanced Accuracy:    {agg['balanced_accuracy_mean']} +/- {agg['balanced_accuracy_std']}")
        print(f"  ROC-AUC:              {agg['roc_auc_mean']} +/- {agg['roc_auc_std']}")
        print("-" * 50)

    print("\n================ AGE STRATIFICATION AUDIT ================")
    for cohort, cdata in res["age_analysis"].items():
        print(f"Cohort {cohort} (N={cdata.get('sample_count', 0)}):")
        if "sensitivity" in cdata:
            print(f"  Sensitivity: {cdata['sensitivity']}, Specificity: {cdata['specificity']}, F1: {cdata['f1']}")
        else:
            print(f"  Notice: {cdata.get('notice')}")

    print(f"\nAge Feature Included in Predictors: {res['uses_age']} (Decoupled to preserve fairness)")
    print("Model Artifacts successfully generated:")
    print(f"  - {res['model_path']}")
    print(f"  - {res['schema_path']}")
    print(f"  - {res['meta_path']}")

if __name__ == "__main__":
    main()
