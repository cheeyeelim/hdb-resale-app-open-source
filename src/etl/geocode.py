"""Step 2: Geocode HDB addresses using AWS Amazon Location Service."""

import logging
import time
from pathlib import Path

import boto3
import polars as pl
from omegaconf import DictConfig

logger = logging.getLogger(__name__)


def extract_unique_addresses(raw_path: Path) -> pl.DataFrame:
    """Extract unique block + street_name combinations from raw data."""
    df = pl.scan_parquet(raw_path).select("block", "street_name").unique().collect()
    logger.info(f"Found {len(df)} unique addresses to geocode")
    return df


def geocode_address(
    cfg: DictConfig,
    client,
    block: str,
    street_name: str,
    country: str = "SGP",
) -> dict:
    """Geocode a single address via AWS Amazon Location Service."""
    query_text = f"{block} {street_name}, {country}"

    try:
        response = client.search_place_index_for_text(
            IndexName=cfg.geocoding.place_index,
            Text=query_text,
            MaxResults=1,
            FilterCountries=[country],
        )

        results = response.get("Results", [])
        if results:
            place = results[0]["Place"]
            longitude, latitude = place["Geometry"]["Point"]
            formatted_address = place.get("Label", "")
            return {
                "block": block,
                "street_name": street_name,
                "latitude": latitude,
                "longitude": longitude,
                "formatted_address": formatted_address,
            }
    except Exception as e:
        logger.warning(f"Failed to geocode '{query_text}' - setting response to None: {e}")

        return {
            "block": block,
            "street_name": street_name,
            "latitude": None,
            "longitude": None,
            "formatted_address": None,
        }


def load_existing_geocoded(geocoded_path: Path, cfg: DictConfig) -> pl.DataFrame | None:
    """Load previously geocoded addresses so that geocoding is not repeated.

    Checks for geocoded file in local directory first, then falls back to S3.
    """
    if not geocoded_path.exists():
        logger.info("Geocoded file not found locally, checking in S3")
        # Try to download from S3
        s3 = boto3.client("s3", region_name=cfg.aws.region)
        s3_key = f"{cfg.aws.s3_prefix.geocoded}/hdb_addresses_geocoded.parquet"
        try:
            s3.head_object(Bucket=cfg.aws.s3_bucket, Key=s3_key)
            logger.info(f"Found geocoded file in S3, downloading to {geocoded_path}")
            geocoded_path.parent.mkdir(parents=True, exist_ok=True)
            s3.download_file(cfg.aws.s3_bucket, s3_key, str(geocoded_path))
        except s3.exceptions.ClientError:
            logger.info("No existing geocoded file found locally or in S3")
            return None

    if geocoded_path.exists():
        logger.info(f"Found geocoded file locally at {geocoded_path}")
        df = pl.read_parquet(geocoded_path)
        original_row_count = len(df)
        # Filter out rows with None latitude, longitude and formatted_address
        # This indicates previous failure in geocoding, therefore should re-attempt to geocode them
        df = df.filter(
            pl.col("latitude").is_not_null()
            & pl.col("longitude").is_not_null()
            & pl.col("formatted_address").is_not_null()
        )
        logger.info(
            f"Loaded {len(df)} existing geocoded addresses out of {original_row_count} total addresses"
        )
        if original_row_count != len(df):
            logger.info(
                f"Detected {original_row_count - len(df)} failures in previous geocoding, re-attempting to geocode them"
            )
        return df
    return None


def geocode_addresses(
    addresses: pl.DataFrame,
    cfg: DictConfig,
    geocoded_path: Path,
) -> pl.DataFrame:
    """Geocode all addresses, using cache to skip already-geocoded ones."""
    existing = load_existing_geocoded(geocoded_path, cfg)

    if existing is not None:
        # Find addresses not yet geocoded
        already_done = existing.select("block", "street_name")
        # Keeps rows from the left that do not have a match on the right.
        pending = addresses.join(already_done, on=["block", "street_name"], how="anti")
        logger.info(f"{len(pending)} addresses remaining to geocode")
    else:
        pending = addresses
        existing = pl.DataFrame(
            schema={
                "block": pl.Utf8,
                "street_name": pl.Utf8,
                "latitude": pl.Float64,
                "longitude": pl.Float64,
                "formatted_address": pl.Utf8,
            }
        )

    if len(pending) == 0:
        logger.info("All addresses already geocoded")
        return existing

    results = []
    delay = cfg.geocoding.rate_limit_delay
    client = boto3.client("location", region_name=cfg.aws.region)

    for i, row in enumerate(pending.iter_rows(named=True)):
        result = geocode_address(cfg, client, row["block"], row["street_name"])
        results.append(result)

        if (i + 1) % 100 == 0:
            logger.info(f"Geocoded {i + 1} / {len(pending)} addresses")

        time.sleep(delay)

    new_df = pl.DataFrame(results).cast(
        {
            "latitude": pl.Float64,
            "longitude": pl.Float64,
        }
    )

    combined = pl.concat([existing, new_df])
    logger.info(f"Geocoded all addresses - total {len(combined)} addresses")
    return combined


def upload_to_s3(local_path: Path, cfg: DictConfig) -> str:
    """Upload geocoded data to S3."""
    s3 = boto3.client("s3", region_name=cfg.aws.region)
    s3_file_path = f"{cfg.aws.s3_prefix.geocoded}/hdb_addresses_geocoded.parquet"
    s3.upload_file(str(local_path), cfg.aws.s3_bucket, s3_file_path)
    s3_uri = f"s3://{cfg.aws.s3_bucket}/{s3_file_path}"
    logger.info(f"Uploaded to {s3_uri}")
    return s3_uri


def run(cfg: DictConfig) -> None:
    """Execute the geocoding step."""
    local_dir = Path(cfg.local.data_dir)
    raw_path = local_dir / "raw" / "hdb_resale_raw.parquet"
    geocoded_path = local_dir / "geocoded" / "hdb_addresses_geocoded.parquet"

    if not raw_path.exists():
        logger.info("Raw data not found locally, downloading from S3")
        s3 = boto3.client("s3", region_name=cfg.aws.region)
        s3_file_path = f"{cfg.aws.s3_prefix.raw}/hdb_resale_raw.parquet"
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(cfg.aws.s3_bucket, s3_file_path, str(raw_path))

    addresses = extract_unique_addresses(raw_path)
    geocoded = geocode_addresses(addresses, cfg, geocoded_path)

    geocoded_path.parent.mkdir(parents=True, exist_ok=True)
    geocoded.write_parquet(geocoded_path)

    upload_to_s3(geocoded_path, cfg)
