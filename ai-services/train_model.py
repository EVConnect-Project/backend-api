"""
ML Model Training Script for EVConnect Route Optimizer

This script trains a machine learning model to predict optimal charging stops
based on historical route data, battery capacity, and charger availability.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

def generate_synthetic_training_data(n_samples=10000):
    """
    Generate synthetic training data for the route optimizer
    In production, this would be replaced with real historical data
    """
    np.random.seed(42)
    
    data = {
        'latitude': np.random.uniform(25, 50, n_samples),  # US latitude range
        'longitude': np.random.uniform(-125, -65, n_samples),  # US longitude range
        'distance_from_start': np.random.uniform(0, 500, n_samples),  # km
        'battery_capacity': np.random.uniform(40, 100, n_samples),  # kWh
        'total_distance': np.random.uniform(100, 800, n_samples),  # km
        'stop_number': np.random.randint(1, 5, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Generate target variables (what we want to predict)
    # power_kw: Charger power based on location and demand
    df['power_kw'] = np.random.choice([50, 150, 250, 350], n_samples, p=[0.2, 0.3, 0.4, 0.1])
    
    # Add some correlation with battery capacity
    df['power_kw'] = df['power_kw'] + (df['battery_capacity'] - 70) * 0.5
    
    # duration_minutes: Charging duration based on power and battery
    charge_needed = df['battery_capacity'] * 0.6  # Charge to 80%
    df['duration_minutes'] = (charge_needed / df['power_kw']) * 60
    df['duration_minutes'] = df['duration_minutes'].clip(15, 120)  # 15-120 minutes
    
    # cost_usd: Cost based on energy and market rates
    energy_charged = (df['duration_minutes'] / 60) * df['power_kw']
    price_per_kwh = np.random.uniform(0.35, 0.55, n_samples)
    df['cost_usd'] = energy_charged * price_per_kwh
    
    # confidence: Model confidence (higher for common scenarios)
    df['confidence'] = np.random.uniform(0.7, 0.95, n_samples)
    # Boost confidence for mid-range values
    mask = (df['power_kw'] > 100) & (df['power_kw'] < 300)
    df.loc[mask, 'confidence'] = np.random.uniform(0.85, 0.98, mask.sum())
    
    return df

def train_model():
    """
    Train the ML model for route optimization
    """
    print("🤖 Training ML model for route optimization...")
    
    # Generate training data
    print("📊 Generating synthetic training data...")
    df = generate_synthetic_training_data(10000)
    
    # Features (input)
    X = df[['latitude', 'longitude', 'distance_from_start', 
            'battery_capacity', 'total_distance', 'stop_number']]
    
    # Targets (output) - multi-output prediction
    y = df[['power_kw', 'duration_minutes', 'cost_usd', 'confidence']]
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    print("🔧 Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("🏋️ Training Random Forest model...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=20,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    print("📈 Evaluating model...")
    y_pred = model.predict(X_test_scaled)
    
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n✓ Model Performance:")
    print(f"  MSE: {mse:.4f}")
    print(f"  R² Score: {r2:.4f}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n📊 Feature Importance:")
    print(feature_importance.to_string(index=False))
    
    # Save model and scaler
    print("\n💾 Saving model and scaler...")
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(models_dir, 'route_optimizer.pkl'))
    joblib.dump(scaler, os.path.join(models_dir, 'scaler.pkl'))
    
    print(f"✅ Model saved to: {models_dir}/route_optimizer.pkl")
    print(f"✅ Scaler saved to: {models_dir}/scaler.pkl")
    
    return model, scaler, r2

def test_prediction(model, scaler):
    """
    Test the trained model with sample data
    """
    print("\n🧪 Testing prediction...")
    
    # Sample route: San Francisco to Los Angeles
    test_data = np.array([[
        34.0522,  # latitude (LA area)
        -118.2437,  # longitude
        300,  # distance_from_start (km)
        75,  # battery_capacity (kWh)
        600,  # total_distance (km)
        2  # stop_number
    ]])
    
    test_data_scaled = scaler.transform(test_data)
    prediction = model.predict(test_data_scaled)[0]
    
    print(f"\n📍 Test Route Prediction:")
    print(f"  Power: {prediction[0]:.1f} kW")
    print(f"  Duration: {prediction[1]:.0f} minutes")
    print(f"  Cost: ${prediction[2]:.2f}")
    print(f"  Confidence: {prediction[3]:.2%}")

if __name__ == "__main__":
    print("=" * 60)
    print("EVConnect ML Model Training")
    print("=" * 60)
    
    model, scaler, r2_score = train_model()
    test_prediction(model, scaler)
    
    print("\n" + "=" * 60)
    print(f"✅ Training Complete! Model R² Score: {r2_score:.4f}")
    print("=" * 60)
    print("\n💡 Next steps:")
    print("  1. Review model performance metrics")
    print("  2. Start FastAPI server: python main.py")
    print("  3. Test endpoint: POST http://localhost:5000/predict/route")
