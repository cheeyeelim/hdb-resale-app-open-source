resource "aws_lambda_function" "inference_api" {
  function_name = "${var.project_name}-inference-api"
  role          = aws_iam_role.inference_lambda.arn
  package_type  = "Image"
  image_uri     = "${var.ecr_registry}/${var.image_name_inference_lambda}:${var.image_version_inference_lambda}"

  # Tested max required memory is only 248MB
  memory_size = 300
  timeout     = 30

  logging_config {
    log_format = "JSON"
    log_group  = var.log_group_name_inference_lambda
  }

  tags = {
    Component = "inference"
  }
}

resource "aws_lambda_function_url" "inference_api_url" {
  function_name      = aws_lambda_function.inference_api.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["POST"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 86400
  }
}
