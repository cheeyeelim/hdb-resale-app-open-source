variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
}

variable "target_group_name_apps" {
  description = "Target group name"
  type        = string
}

variable "s3_bucket_name" {
  description = "S3 bucket name"
  type        = string
}

variable "ecr_registry" {
  description = "ECR registry"
  type        = string
}

variable "image_name_dashboard" {
  description = "Docker image for dashboard"
  type        = string
}

variable "image_version_dashboard" {
  description = "Docker image version for dashboard"
  type        = string
}

variable "image_name_etl" {
  description = "Docker image for ETL"
  type        = string
}

variable "image_version_etl" {
  description = "Docker image version for ETL"
  type        = string
}

variable "image_name_inference_lambda" {
  description = "Docker image for inference lambda"
  type        = string
}

variable "image_version_inference_lambda" {
  description = "Docker image version for inference lambda"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "ecs_capacity_provider_name" {
  description = "ECS capacity provider name"
  type        = string
}

variable "ecs_security_group_name" {
  description = "ECS security group name"
  type        = string
}

variable "hdb_resale_inference_api_url" {
  description = "Endpoint for HDB resale inference"
  type        = string
}

variable "log_group_name_dashboard" {
  description = "Log group name for dashboard"
  type        = string
}

variable "log_group_name_etl" {
  description = "Log group name for ETL"
  type        = string
}

variable "log_group_name_step_functions" {
  description = "Log group name for step functions"
  type        = string
}

variable "log_group_name_inference_lambda" {
  description = "Log group name for inference lambda"
  type        = string
}

variable "scheduler_group_name" {
  description = "EventBridge scheduler group name"
  type        = string
}