"""CLI entrypoint for HDB Resale ETL pipeline."""

import argparse
import logging
import sys

from omegaconf import OmegaConf

from src.etl import geocode, ingest, process, train

STEPS = {
    "ingest": ingest.run,
    "geocode": geocode.run,
    "process": process.run,
    "train": train.run,
}


def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def main() -> None:
    """Parse arguments and run the specified ETL step."""
    parser = argparse.ArgumentParser(description="HDB Resale ETL Pipeline")
    parser.add_argument(
        "--step",
        required=True,
        choices=list(STEPS.keys()),
        help="Pipeline step to execute",
    )
    parser.add_argument(
        "--config",
        default="config/pipeline.yaml",
        help="Path to OmegaConf YAML config file",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level",
    )
    args = parser.parse_args()

    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    logger.info("Loading config from %s", args.config)
    cfg = OmegaConf.load(args.config)

    logger.info("Running step: %s", args.step)
    step_fn = STEPS[args.step]
    step_fn(cfg)

    logger.info("Step '%s' completed successfully", args.step)


if __name__ == "__main__":
    main()
