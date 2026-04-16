"""Tests for the ingest module."""

import polars as pl
from omegaconf import OmegaConf

from src.etl.ingest import fetch_all_records, records_to_parquet

SAMPLE_RESPONSE = {
    "success": True,
    "result": {
        "resource_id": "test",
        "records": [
            {
                "_id": 1,
                "month": "2023-01",
                "town": "ANG MO KIO",
                "flat_type": "3 ROOM",
                "block": "108",
                "street_name": "ANG MO KIO AVE 4",
                "storey_range": "01 TO 03",
                "floor_area_sqm": "67",
                "flat_model": "New Generation",
                "lease_commence_date": "1978",
                "remaining_lease": "60 years 07 months",
                "resale_price": "250000",
            },
            {
                "_id": 2,
                "month": "2023-02",
                "town": "BEDOK",
                "flat_type": "4 ROOM",
                "block": "501",
                "street_name": "BEDOK NORTH ST 3",
                "storey_range": "04 TO 06",
                "floor_area_sqm": "92",
                "flat_model": "Improved",
                "lease_commence_date": "1985",
                "remaining_lease": "57 years 03 months",
                "resale_price": "450000",
            },
        ],
        "total": 2,
    },
}


def make_test_cfg():
    return OmegaConf.create(
        {
            "data_source": {
                "api_url": "https://example.com/api",
                "resource_id": "test",
                "page_size": 100,
            },
            "aws": {
                "region": "ap-southeast-1",
                "s3_bucket": "test-bucket",
                "s3_prefix": {"raw": "raw"},
            },
            "local": {"data_dir": "data"},
        }
    )


def test_fetch_all_records(httpx_mock):
    """Test paginated API fetch."""
    cfg = make_test_cfg()

    httpx_mock.add_response(
        url="https://example.com/api?resource_id=test&limit=100&offset=0",
        json=SAMPLE_RESPONSE,
    )

    records = fetch_all_records(cfg)
    assert len(records) == 2
    assert records[0]["town"] == "ANG MO KIO"
    assert records[1]["town"] == "BEDOK"


def test_records_to_parquet(tmp_path):
    """Test conversion of records to Parquet."""
    records = SAMPLE_RESPONSE["result"]["records"]
    output_path = tmp_path / "test.parquet"

    result_path = records_to_parquet(records, output_path)

    assert result_path.exists()
    df = pl.read_parquet(result_path)
    assert len(df) == 2
    assert df.schema["resale_price"] == pl.Float64
    assert df.schema["floor_area_sqm"] == pl.Float64
    assert df.schema["lease_commence_date"] == pl.Int32
    assert df["resale_price"][0] == 250000.0
