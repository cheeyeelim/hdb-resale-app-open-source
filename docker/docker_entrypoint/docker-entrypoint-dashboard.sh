#!/bin/bash

# Set environment variables
export NODE_ENV=production
export HOSTNAME="0.0.0.0"
export PORT=3000
export INFERENCE_API_URL=$(aws ssm get-parameter --name "/endpoint/hdb-resale-inference-api-url" --query "Parameter.Value" --output text)

cd /app
# Using $@ allows CMD override
node server.js "$@"