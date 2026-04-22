"""Step 3: Process and join raw HDB data with geocoded addresses."""

import logging
from pathlib import Path

import boto3
import polars as pl
from omegaconf import DictConfig

logger = logging.getLogger(__name__)


def parse_storey_midpoint(storey_range: pl.Expr) -> pl.Expr:
    """Parse storey range like '01 TO 03' into a midpoint float."""
    low = storey_range.str.extract(r"^(\d+)").cast(pl.Float64)
    high = storey_range.str.extract(r"(\d+)$").cast(pl.Float64)
    return ((low + high) / 2).alias("storey_midpoint")


def parse_remaining_lease(remaining_lease: pl.Expr) -> pl.Expr:
    """Parse remaining lease like '98 years 04 months' into total number of months."""
    years = remaining_lease.str.extract(r"^(\d+) years").cast(pl.Float64)
    months = remaining_lease.str.extract(r"(\d+) months$").cast(pl.Float64)
    return (years * 12 + months).alias("remaining_lease_months")


def process_data(raw_path: Path, geocoded_path: Path, output_path: Path) -> Path:
    """Join raw transactions with geocoded addresses and clean data."""
    raw = pl.scan_parquet(raw_path)
    geocoded = pl.scan_parquet(geocoded_path)

    # Join on block + street_name
    joined = raw.join(geocoded, on=["block", "street_name"], how="left")

    # Feature engineering
    processed = joined.with_columns(
        pl.col("month").str.slice(0, 4).cast(pl.Int32).alias("year_num"),
        pl.col("month").str.slice(5, 2).cast(pl.Int32).alias("month_num"),
        pl.col("floor_area_sqm").cast(pl.Float64),
        parse_storey_midpoint(pl.col("storey_range")),
        parse_remaining_lease(pl.col("remaining_lease")),
    ).select(
        "month",
        "year_num",
        "month_num",
        "town",
        "flat_type",
        "block",
        "street_name",
        "storey_range",
        "storey_midpoint",
        "floor_area_sqm",
        "flat_model",
        "lease_commence_date",
        "remaining_lease",
        "remaining_lease_months",
        "resale_price",
        "latitude",
        "longitude",
        "formatted_address",
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result = processed.collect()
    result.write_parquet(output_path)

    logger.info(f"Processed {len(result)} transactions → {output_path}")

    assert len(result) == len(pl.read_parquet(raw_path)), (
        "Processed data length does not match raw data length"
    )

    return output_path


def upload_to_s3(local_path: Path, cfg: DictConfig) -> str:
    """Upload processed data to S3."""
    s3 = boto3.client("s3", region_name=cfg.aws.region)
    s3_file_path = f"{cfg.aws.s3_prefix.processed}/hdb_resale_processed.parquet"
    s3.upload_file(str(local_path), cfg.aws.s3_bucket, s3_file_path)
    s3_uri = f"s3://{cfg.aws.s3_bucket}/{s3_file_path}"
    logger.info(f"Uploaded to {s3_uri}")
    return s3_uri


def run(cfg: DictConfig) -> None:
    """Execute the processing step."""
    local_dir = Path(cfg.local.data_dir)
    raw_path = local_dir / "raw" / "hdb_resale_raw.parquet"
    geocoded_path = local_dir / "geocoded" / "hdb_addresses_geocoded.parquet"
    output_path = local_dir / "processed" / "hdb_resale_processed.parquet"

    s3 = boto3.client("s3", region_name=cfg.aws.region)
    if not raw_path.exists():
        logger.info("Raw data not found locally, downloading from S3")
        s3_file_path_raw = f"{cfg.aws.s3_prefix.raw}/hdb_resale_raw.parquet"
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(cfg.aws.s3_bucket, s3_file_path_raw, str(raw_path))

    if not geocoded_path.exists():
        logger.info("Geocoded data not found locally, downloading from S3")
        s3_file_path_geo = f"{cfg.aws.s3_prefix.geocoded}/hdb_addresses_geocoded.parquet"
        geocoded_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(cfg.aws.s3_bucket, s3_file_path_geo, str(geocoded_path))

    process_data(raw_path, geocoded_path, output_path)
    upload_to_s3(output_path, cfg)
