#!/bin/bash

cd /app
# Using $@ allows CMD override
uv run --env-file .env python -m src.etl.main "$@"