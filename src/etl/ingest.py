"""Step 1: Ingest HDB resale flat transaction data from data.gov.sg API."""

import logging
import time
from pathlib import Path

import boto3
import httpx
import polars as pl
from omegaconf import DictConfig

logger = logging.getLogger(__name__)


def download_data(cfg: DictConfig, output_path: Path) -> None:
    """Download all records from data.gov.sg API using full download URL.

    Each run will always download the full data, starting from 2017.

    This does not use the Datastore API, as it is heavily rate-limited.
    """
    api_base_url = cfg.data_source.api_base_url
    api_key = cfg.data_source.api_key
    resource_id = cfg.data_source.resource_id
    polling_wait = 10

    with httpx.Client(timeout=60.0) as client:
        headers = {
            "x-api-key": api_key,
        }

        # Send request to initiate download
        initiate_url = f"{api_base_url}/{resource_id}/initiate-download"
        logger.info(f"Initiate data download datasetId={resource_id}")
        response = client.get(initiate_url, headers=headers)
        response.raise_for_status()

        # Send request to poll for download readiness
        poll_url = f"{api_base_url}/{resource_id}/poll-download"
        num_try = 0
        while True:
            logger.info(
                f"Polling for data download to be ready datasetId={resource_id} polling_wait={polling_wait} num_try={num_try}"
            )
            response = client.get(poll_url, headers=headers)
            response.raise_for_status()

            data = response.json()
            status = data.get("data").get("status")
            download_url = data.get("data").get("url")
            if status == "DOWNLOAD_SUCCESS":
                logger.info(f"Download ready, download_url={download_url}")
                break

            time.sleep(polling_wait)
            num_try += 1

        # Stream download in chunks and write directly to local CSV file
        logger.info(f"Downloading data from {download_url}")
        output_path.mkdir(parents=True, exist_ok=True)
        output_file_path = output_path / "hdb_resale_raw.csv"

        with client.stream("GET", download_url) as stream:
            stream.raise_for_status()
            with open(output_file_path, "wb") as f:
                for chunk in stream.iter_bytes(chunk_size=128000):
                    f.write(chunk)

        logger.info(f"Downloaded data to {output_file_path}")


def records_to_parquet(output_path: Path) -> None:
    """Convert CSV to Parquet using Polars."""
    # Based on official schema - https://data.gov.sg/datasets?agencies=Housing+%26+Development+Board+(HDB)&resultId=d_8b84c4ee58e3cfc0ece0d773c8ca6abc
    # Conversion to be handled manually in code logic
    SCHEMA = {
        "month": pl.String,
        "town": pl.String,
        "flat_type": pl.String,
        "block": pl.String,
        "street_name": pl.String,
        "storey_range": pl.String,
        "floor_area_sqm": pl.String,
        "flat_model": pl.String,
        "lease_commence_date": pl.String,
        "remaining_lease": pl.String,
        "resale_price": pl.Float64,
    }

    df = pl.read_csv(output_path / "hdb_resale_raw.csv", schema=SCHEMA)
    df.write_parquet(output_path / "hdb_resale_raw.parquet")
    logger.info(f"Converted CSV to Parquet at {output_path / 'hdb_resale_raw.parquet'}")


def upload_to_s3(cfg: DictConfig, output_path: Path) -> None:
    """Upload a local file to S3."""
    s3 = boto3.client("s3", region_name=cfg.aws.region)
    s3_file_path = f"{cfg.aws.s3_prefix.raw}/hdb_resale_raw.parquet"
    s3.upload_file(str(output_path / "hdb_resale_raw.parquet"), cfg.aws.s3_bucket, s3_file_path)
    s3_uri = f"s3://{cfg.aws.s3_bucket}/{s3_file_path}"
    logger.info(f"Uploaded to {s3_uri}")


def run(cfg: DictConfig) -> None:
    """Execute the ingestion step."""
    local_dir = Path(cfg.local.data_dir)
    output_path = local_dir / "raw"

    download_data(cfg, output_path)
    records_to_parquet(output_path)
    upload_to_s3(cfg, output_path)
