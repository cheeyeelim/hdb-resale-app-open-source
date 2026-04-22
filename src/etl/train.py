"""Step 4: Train ML model to predict HDB resale flat prices."""

import logging
from pathlib import Path

import boto3
import joblib
import polars as pl
from omegaconf import DictConfig
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "town",
    "storey_midpoint",
    "floor_area_sqm",
    "remaining_lease_months",
    "year_num",
    "month_num",
]
CATEGORICAL_COLS = ["town"]
NUMERIC_COLS = [
    "storey_midpoint",
    "floor_area_sqm",
    "remaining_lease_months",
    "year_num",
    "month_num",
]
TARGET_COL = "resale_price"


def build_model(cfg: DictConfig) -> Pipeline:
    """Build a scikit-learn pipeline with preprocessing and regressor."""
    model_params = dict(cfg.model.params)

    # For categorical, this will encode low frequency categories as 'infrequent' if the percentage appearance is under 0.01
    # HistGradientBoostingRegressor requires dense data, so we set sparse_output=False
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(
                    handle_unknown="infrequent_if_exist", min_frequency=0.01, sparse_output=False
                ),
                CATEGORICAL_COLS,
            ),
        ],
        remainder="passthrough",
        n_jobs=-1,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", HistGradientBoostingRegressor(**model_params)),
        ]
    )
    return pipeline


def train_model(processed_path: Path, cfg: DictConfig) -> tuple[Pipeline, dict]:
    """Train the model and return it along with evaluation metrics."""
    df = pl.read_parquet(processed_path)

    # Drop rows with missing values in feature or target columns
    required_cols = [*FEATURE_COLS, TARGET_COL]
    df = df.drop_nulls(subset=required_cols)

    logger.info(f"Training data shape: {len(df)} rows, {len(FEATURE_COLS)} features")

    X = df.select(FEATURE_COLS).to_pandas()
    y = df.select(TARGET_COL).to_pandas()[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=cfg.model.test_size, random_state=cfg.model.params.random_state
    )

    model = build_model(cfg)
    logger.info("Training resale price prediction model...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = {
        "rmse": float(root_mean_squared_error(y_test, y_pred)),
        "mae": float(mean_absolute_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
        "train_size": len(X_train),
        "test_size": len(X_test),
    }

    logger.info(
        f"Model metrics: RMSE={metrics['rmse']:.2f}, MAE={metrics['mae']:.2f}, R²={metrics['r2']:.4f}"
    )
    return model, metrics


def save_model(model: Pipeline, output_path: Path) -> None:
    """Save trained model locally."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    logger.info(f"Saved model to {output_path}")


def upload_to_s3(local_path: Path, cfg: DictConfig) -> str:
    """Upload trained model to S3."""
    s3 = boto3.client("s3", region_name=cfg.aws.region)
    s3_file_path = f"{cfg.aws.s3_prefix.models}/resale_price_prediction_model.joblib"
    s3.upload_file(str(local_path), cfg.aws.s3_bucket, s3_file_path)
    s3_uri = f"s3://{cfg.aws.s3_bucket}/{s3_file_path}"
    logger.info(f"Uploaded model to {s3_uri}")
    return s3_uri


def run(cfg: DictConfig) -> None:
    """Execute the training step."""
    local_dir = Path(cfg.local.data_dir)
    processed_path = local_dir / "processed" / "hdb_resale_processed.parquet"
    model_path = local_dir / "models" / "resale_price_prediction_model.joblib"

    if not processed_path.exists():
        logger.info("Processed data not found locally, downloading from S3")
        s3 = boto3.client("s3", region_name=cfg.aws.region)
        s3_file_path = f"{cfg.aws.s3_prefix.processed}/hdb_resale_processed.parquet"
        processed_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(cfg.aws.s3_bucket, s3_file_path, str(processed_path))

    model, metrics = train_model(processed_path, cfg)
    save_model(model, model_path)
    upload_to_s3(model_path, cfg)

    logger.info(f"Training complete. Metrics: {metrics}")
