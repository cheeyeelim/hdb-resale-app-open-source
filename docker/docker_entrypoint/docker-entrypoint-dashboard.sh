#!/bin/bash

set -euo pipefail

cd /app
# Using $@ allows CMD override
node server.js "$@"