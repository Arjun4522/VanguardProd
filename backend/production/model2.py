import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, classification_report, 
                             confusion_matrix, ConfusionMatrixDisplay,
                             roc_auc_score, precision_recall_curve)
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# Load dataset with validation
try:
    data = pd.read_csv('dataset_sdn.csv')
    print(f"Dataset loaded with {len(data)} records")
    print("Initial class distribution:\n", data['label'].value_counts(normalize=True))
except FileNotFoundError:
    raise SystemExit("Error: Dataset file not found. Please check the file path.")

# Data quality checks
print("\n=== Data Quality Checks ===")
print("Missing values before cleaning:", data.isnull().sum())
data = data.dropna()
print(f"Records after cleaning: {len(data)}")

# Feature selection with validation
feature_cols = ['pktcount', 'bytecount', 'pktperflow', 'byteperflow']
try:
    X = data[feature_cols]
    y = data['label']
except KeyError as e:
    raise SystemExit(f"Error: Required column {e} not found in dataset")

# Feature analysis
print("\n=== Feature Analysis ===")
print("Feature distributions:\n", X.describe())
mi_scores = mutual_info_classif(X, y)
print("\nMutual Information Scores:")
print(pd.Series(mi_scores, index=feature_cols).sort_values(ascending=False))

# Split data with stratification
X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2, 
    stratify=y,
    random_state=42
)

# Model pipeline with preprocessing
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', RandomForestClassifier(
        n_estimators=100,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    ))
])

# Cross-validation
print("\n=== Cross-Validation ===")
cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, n_jobs=-1)
print(f"CV Accuracy: {np.mean(cv_scores):.4f} ± {np.std(cv_scores):.4f}")

# Final training
pipeline.fit(X_train, y_train)

# Evaluation
y_pred = pipeline.predict(X_test)
y_proba = pipeline.predict_proba(X_test)[:, 1]

print("\n=== Model Evaluation ===")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("ROC AUC:", roc_auc_score(y_test, y_proba))
print("\nClassification Report:\n", classification_report(y_test, y_pred))



# Save model with metadata
model_info = {
    'training_date': pd.Timestamp.now().isoformat(),
    'features': feature_cols,
    'classes': pipeline.classes_.tolist(),
    'metrics': {
        'accuracy': accuracy_score(y_test, y_pred),
        'roc_auc': roc_auc_score(y_test, y_proba)
    }
}

joblib.dump({
    'model': pipeline,
    'metadata': model_info
}, 'model2.pkl')

print("\n✅ Model successfully trained and saved with metadata")