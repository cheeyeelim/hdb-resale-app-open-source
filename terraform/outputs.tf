output "step_functions_arn" {
  description = "Step Functions state machine ARN"
  value       = aws_sfn_state_machine.etl_pipeline.arn
}

output "step_functions_name" {
  description = "Step Functions state machine name"
  value       = aws_sfn_state_machine.etl_pipeline.name
}

output "inference_api_url" {
  description = "The endpoint URL for the inference Lambda function"
  value       = aws_lambda_function_url.inference_api_url.function_url
}
