"""Tests for the train module."""

import polars as pl
from omegaconf import OmegaConf

from src.etl.train import build_model, train_model


def _make_processed_parquet(tmp_path):
    """Create a small processed Parquet for training tests."""
    import random

    random.seed(42)

    towns = ["ANG MO KIO", "BEDOK", "TAMPINES", "WOODLANDS"]
    flat_types = ["3 ROOM", "4 ROOM", "5 ROOM"]

    rows = []
    for i in range(200):
        town = towns[i % len(towns)]
        flat_type = flat_types[i % len(flat_types)]
        year = 2017 + (i % 7)
        month_num = (i % 12) + 1
        floor_area = 60 + (i % 60)
        storey_mid = 3 + (i % 15)
        lease_year = 1970 + (i % 30)
        remaining = 99 - (2023 - lease_year)
        price = 200000 + floor_area * 3000 + storey_mid * 5000 + random.randint(-20000, 20000)

        rows.append(
            {
                "month": f"{year}-{month_num:02d}",
                "year": year,
                "month_num": month_num,
                "town": town,
                "flat_type": flat_type,
                "block": str(100 + i),
                "street_name": f"STREET {i}",
                "storey_range": f"{storey_mid - 1:02d} TO {storey_mid + 1:02d}",
                "storey_midpoint": float(storey_mid),
                "floor_area_sqm": float(floor_area),
                "flat_model": "Improved",
                "lease_commence_date": lease_year,
                "remaining_lease": f"{remaining} years",
                "remaining_lease_years": float(remaining),
                "resale_price": float(price),
                "latitude": 1.35 + (i % 10) * 0.01,
                "longitude": 103.8 + (i % 10) * 0.01,
                "confidence": "High",
                "formatted_address": f"{100 + i} Street {i}",
            }
        )

    df = pl.DataFrame(rows)
    path = tmp_path / "processed.parquet"
    df.write_parquet(path)
    return path


def make_test_cfg():
    return OmegaConf.create(
        {
            "model": {
                "algorithm": "gradient_boosting",
                "params": {
                    "n_estimators": 10,
                    "max_depth": 3,
                    "learning_rate": 0.1,
                    "random_state": 42,
                },
                "test_size": 0.2,
            },
        }
    )


def test_build_model():
    """Test that model pipeline builds correctly."""
    cfg = make_test_cfg()
    model = build_model(cfg)
    assert model is not None
    assert len(model.steps) == 2


def test_train_model(tmp_path):
    """Test model training on sample data."""
    cfg = make_test_cfg()
    processed_path = _make_processed_parquet(tmp_path)

    model, metrics = train_model(processed_path, cfg)

    assert model is not None
    assert "rmse" in metrics
    assert "mae" in metrics
    assert "r2" in metrics
    assert metrics["r2"] > 0  # Sanity check: model should do better than random
    assert metrics["train_size"] > 0
    assert metrics["test_size"] > 0
