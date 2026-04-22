"""Tests for the process module."""

import polars as pl

from src.etl.process import process_data


def _make_raw_parquet(tmp_path):
    raw = pl.DataFrame(
        {
            "month": ["2023-01", "2023-06"],
            "town": ["ANG MO KIO", "BEDOK"],
            "flat_type": ["3 ROOM", "4 ROOM"],
            "block": ["108", "501"],
            "street_name": ["ANG MO KIO AVE 4", "BEDOK NORTH ST 3"],
            "storey_range": ["01 TO 03", "10 TO 12"],
            "floor_area_sqm": [67.0, 92.0],
            "flat_model": ["New Generation", "Improved"],
            "lease_commence_date": [1978, 1985],
            "remaining_lease": ["60 years 07 months", "57 years 03 months"],
            "resale_price": [250000.0, 450000.0],
            "_id": [1, 2],
        }
    )
    path = tmp_path / "raw.parquet"
    raw.write_parquet(path)
    return path


def _make_geocoded_parquet(tmp_path):
    geocoded = pl.DataFrame(
        {
            "block": ["108", "501"],
            "street_name": ["ANG MO KIO AVE 4", "BEDOK NORTH ST 3"],
            "latitude": [1.3700, 1.3270],
            "longitude": [103.8490, 103.9340],
            "confidence": ["High", "High"],
            "formatted_address": [
                "108 Ang Mo Kio Ave 4, Singapore",
                "501 Bedok North St 3, Singapore",
            ],
        }
    )
    path = tmp_path / "geocoded.parquet"
    geocoded.write_parquet(path)
    return path


def test_process_data(tmp_path):
    """Test full processing pipeline."""
    raw_path = _make_raw_parquet(tmp_path)
    geocoded_path = _make_geocoded_parquet(tmp_path)
    output_path = tmp_path / "processed.parquet"

    result_path = process_data(raw_path, geocoded_path, output_path)

    assert result_path.exists()

    df = pl.read_parquet(result_path)
    assert len(df) == 2

    # Check engineered features
    assert "year" in df.columns
    assert "month_num" in df.columns
    assert "storey_midpoint" in df.columns
    assert "remaining_lease_years" in df.columns
    assert "latitude" in df.columns
    assert "longitude" in df.columns

    # Check storey midpoint calculation
    row_0 = df.filter(pl.col("block") == "108")
    assert row_0["storey_midpoint"][0] == 2.0  # (1 + 3) / 2

    row_1 = df.filter(pl.col("block") == "501")
    assert row_1["storey_midpoint"][0] == 11.0  # (10 + 12) / 2

    # Check year extraction
    assert row_0["year"][0] == 2023
    assert row_0["month_num"][0] == 1
