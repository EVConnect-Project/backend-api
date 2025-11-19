"""
Train Gradient Boosting model for mechanic recommendation ranking
Uses synthetic data based on real-world patterns
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
import os

def generate_synthetic_training_data(n_samples=5000):
    """
    Generate synthetic training data based on real-world patterns
    Features:
    - distance_km: Distance from user to mechanic
    - rating: Mechanic rating (1-5)
    - available: Is mechanic available (0 or 1)
    - service_match: % of required services offered (0-1)
    - completed_jobs: Number of completed jobs
    - years_experience: Years of experience
    - urgency_level: 0 (low), 1 (medium), 2 (high), 3 (critical)
    - price_per_hour: Mechanic hourly rate
    
    Target: user_selection_score (0-100) - likelihood user will select this mechanic
    """
    
    np.random.seed(42)
    
    data = {
        'distance_km': np.random.exponential(scale=5, size=n_samples),  # Most mechanics are nearby
        'rating': np.random.beta(8, 2, size=n_samples) * 5,  # Most ratings are good (4-5 stars)
        'available': np.random.choice([0, 1], size=n_samples, p=[0.3, 0.7]),  # 70% available
        'service_match': np.random.beta(3, 2, size=n_samples),  # Some have better service match
        'completed_jobs': np.random.poisson(lam=50, size=n_samples),  # Experience varies
        'years_experience': np.random.gamma(shape=3, scale=2, size=n_samples),
        'urgency_level': np.random.choice([0, 1, 2, 3], size=n_samples, p=[0.1, 0.4, 0.3, 0.2]),
        'price_per_hour': np.random.normal(loc=50, scale=15, size=n_samples),  # $35-$65/hr
    }
    
    df = pd.DataFrame(data)
    
    # Clip values to realistic ranges
    df['distance_km'] = df['distance_km'].clip(0.1, 50)
    df['rating'] = df['rating'].clip(1, 5)
    df['completed_jobs'] = df['completed_jobs'].clip(0, 500)
    df['years_experience'] = df['years_experience'].clip(0, 30)
    df['price_per_hour'] = df['price_per_hour'].clip(25, 100)
    
    # Calculate target: user_selection_score (what users historically chose)
    # This is the "ground truth" we're training the model to predict
    
    df['user_selection_score'] = 0.0
    
    # Distance factor (closer = better) - 30% weight
    df['user_selection_score'] += (1 - (df['distance_km'] / 50)) * 30
    
    # Rating factor - 25% weight
    df['user_selection_score'] += (df['rating'] / 5) * 25
    
    # Availability factor - 20% weight
    df['user_selection_score'] += df['available'] * 20
    
    # Service match factor - 15% weight
    df['user_selection_score'] += df['service_match'] * 15
    
    # Experience factor - 10% weight
    df['user_selection_score'] += (np.minimum(df['completed_jobs'], 200) / 200) * 10
    
    # Urgency modifiers
    urgency_mask_high = df['urgency_level'] >= 2
    df.loc[urgency_mask_high, 'user_selection_score'] += (1 - (df.loc[urgency_mask_high, 'distance_km'] / 50)) * 15
    df.loc[urgency_mask_high, 'user_selection_score'] += df.loc[urgency_mask_high, 'available'] * 10
    
    # Price factor (lower price = slight boost)
    df['user_selection_score'] += (1 - (df['price_per_hour'] - 25) / 75) * 5
    
    # Add some random noise (real world isn't perfect)
    df['user_selection_score'] += np.random.normal(0, 3, size=n_samples)
    
    # Clip final score to 0-100
    df['user_selection_score'] = df['user_selection_score'].clip(0, 100)
    
    return df

def train_model():
    """Train Gradient Boosting model for mechanic ranking"""
    
    print("🤖 Training Mechanic Recommendation Model...")
    print("=" * 60)
    
    # Generate training data
    print("\n1. Generating synthetic training data...")
    df = generate_synthetic_training_data(n_samples=5000)
    print(f"   ✓ Generated {len(df)} training samples")
    print(f"   ✓ Features: {list(df.columns[:-1])}")
    
    # Prepare features and target
    feature_columns = [
        'distance_km', 'rating', 'available', 'service_match',
        'completed_jobs', 'years_experience', 'urgency_level', 'price_per_hour'
    ]
    
    X = df[feature_columns]
    y = df['user_selection_score']
    
    # Train-test split
    print("\n2. Splitting data (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"   ✓ Train: {len(X_train)} samples")
    print(f"   ✓ Test: {len(X_test)} samples")
    
    # Standardize features
    print("\n3. Standardizing features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    print("   ✓ Features scaled to mean=0, std=1")
    
    # Train Gradient Boosting model
    print("\n4. Training Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        min_samples_split=10,
        min_samples_leaf=4,
        subsample=0.8,
        random_state=42,
        verbose=1
    )
    
    model.fit(X_train_scaled, y_train)
    print("   ✓ Model training complete")
    
    # Evaluate model
    print("\n5. Evaluating model performance...")
    y_pred_train = model.predict(X_train_scaled)
    y_pred_test = model.predict(X_test_scaled)
    
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    
    print(f"\n   Training Metrics:")
    print(f"   - RMSE: {train_rmse:.2f}")
    print(f"   - R² Score: {train_r2:.4f}")
    print(f"\n   Test Metrics:")
    print(f"   - RMSE: {test_rmse:.2f}")
    print(f"   - R² Score: {test_r2:.4f}")
    
    # Feature importance
    print("\n6. Feature Importance:")
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for idx, row in feature_importance.iterrows():
        print(f"   - {row['feature']}: {row['importance']:.4f}")
    
    # Save model and scaler
    print("\n7. Saving model and scaler...")
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, 'mechanic_ranker.pkl')
    scaler_path = os.path.join(models_dir, 'mechanic_scaler.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"   ✓ Model saved to: {model_path}")
    print(f"   ✓ Scaler saved to: {scaler_path}")
    
    print("\n" + "=" * 60)
    print("✅ Model training complete!")
    print("=" * 60)
    
    return model, scaler, feature_columns

if __name__ == "__main__":
    train_model()
