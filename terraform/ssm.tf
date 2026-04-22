resource "aws_ssm_parameter" "hdb_resale_inference_api_url" {
  name  = "/endpoint/hdb-resale-inference-api-url"
  type  = "String"
  value = var.hdb_resale_inference_api_url

  tags = {
    Component = "dashboard"
  }
}

resource "aws_ssm_parameter" "hdb_resale_node_env" {
  name  = "/dashboard/hdb-resale-node-env"
  type  = "String"
  value = "production"

  tags = {
    Component = "dashboard"
  }
}

resource "aws_ssm_parameter" "hdb_resale_hostname" {
  name  = "/dashboard/hdb-resale-hostname"
  type  = "String"
  value = "0.0.0.0"

  tags = {
    Component = "dashboard"
  }
}

resource "aws_ssm_parameter" "hdb_resale_port" {
  name  = "/dashboard/hdb-resale-port"
  type  = "String"
  value = "3000"

  tags = {
    Component = "dashboard"
  }
}