import json
import os

import joblib
import pandas as pd

# Load the model at cold start
MODEL_PATH = os.environ.get("MODEL_PATH", "resale_price_prediction_model.joblib")

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Expected features based on model training
EXPECTED_FEATURES = [
    "town",
    "storey_midpoint",
    "floor_area_sqm",
    "remaining_lease_months",
    "year_num",
    "month_num",
]


def lambda_handler(event, context):
    if model is None:
        return {"statusCode": 500, "body": json.dumps({"error": "Model failed to load."})}

    try:
        # Parse the input JSON from the Function URL event body
        body = event.get("body", "{}")
        payload = json.loads(body) if isinstance(body, str) else body

        # The payload could be a single dictionary of features, or a list of dictionaries.
        # Let's enforce it to be a list for consistency with DataFrame format.
        if isinstance(payload, dict):
            payload = [payload]

        # Create a pandas DataFrame from the input
        df = pd.DataFrame(payload)

        # Verify all expected features are present
        missing_features = [f for f in EXPECTED_FEATURES if f not in df.columns]
        if missing_features:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": f"Missing features: {missing_features}"}),
            }

        # Ensure only the expected columns are passed to the model in the correct order
        X = df[EXPECTED_FEATURES]

        # Make predictions
        predictions = model.predict(X)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"predictions": predictions.tolist()}),
        }

    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON body format."})}
    except Exception as e:
        print(f"Error during inference: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
