"""Tests for the geocode module."""

from unittest.mock import MagicMock

import polars as pl
from omegaconf import OmegaConf

from src.etl.geocode import extract_unique_addresses, geocode_address

MOCK_LOCATION_RESPONSE = {
    "Results": [
        {
            "Place": {
                "Geometry": {"Point": [103.8198, 1.3521]},
                "Label": "108 ANG MO KIO AVE 4, Singapore",
            },
        }
    ]
}


def make_test_cfg():
    return OmegaConf.create(
        {
            "geocoding": {
                "place_index": "test-place-index",
                "rate_limit_delay": 0,
            },
        }
    )


def test_extract_unique_addresses(tmp_path):
    """Test unique address extraction from raw Parquet."""
    raw_data = pl.DataFrame(
        {
            "block": ["108", "108", "501"],
            "street_name": ["ANG MO KIO AVE 4", "ANG MO KIO AVE 4", "BEDOK NORTH ST 3"],
            "month": ["2023-01", "2023-02", "2023-01"],
            "town": ["ANG MO KIO", "ANG MO KIO", "BEDOK"],
            "flat_type": ["3 ROOM", "3 ROOM", "4 ROOM"],
            "storey_range": ["01 TO 03", "04 TO 06", "01 TO 03"],
            "floor_area_sqm": [67.0, 67.0, 92.0],
            "flat_model": ["New Generation", "New Generation", "Improved"],
            "lease_commence_date": [1978, 1978, 1985],
            "remaining_lease": ["60 years", "60 years", "57 years"],
            "resale_price": [250000.0, 260000.0, 450000.0],
            "_id": [1, 2, 3],
        }
    )
    raw_path = tmp_path / "raw.parquet"
    raw_data.write_parquet(raw_path)

    unique = extract_unique_addresses(raw_path)
    assert len(unique) == 2


def test_geocode_address():
    """Test geocoding a single address via Amazon Location Service."""
    cfg = make_test_cfg()

    mock_client = MagicMock()
    mock_client.search_place_index_for_text.return_value = MOCK_LOCATION_RESPONSE

    result = geocode_address(cfg, mock_client, "108", "ANG MO KIO AVE 4")

    assert result["latitude"] == 1.3521
    assert result["longitude"] == 103.8198

    mock_client.search_place_index_for_text.assert_called_once_with(
        IndexName="test-place-index",
        Text="108 ANG MO KIO AVE 4, SGP",
        MaxResults=1,
        FilterCountries=["SGP"],
    )


def test_geocode_address_failure():
    """Test graceful handling of geocoding failure."""
    cfg = make_test_cfg()

    mock_client = MagicMock()
    mock_client.search_place_index_for_text.return_value = {"Results": []}

    result = geocode_address(cfg, mock_client, "999", "UNKNOWN ST")

    assert result["latitude"] is None
    assert result["longitude"] is None
