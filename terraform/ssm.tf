resource "aws_ssm_parameter" "hdb_resale_inference_api_url" {
  name  = "/endpoint/hdb-resale-inference-api-url"
  type  = "String"
  value = var.hdb_resale_inference_api_url

  tags = {
    Component = "dashboard"
  }
}