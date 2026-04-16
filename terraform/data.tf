data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_lb_target_group" "dashboard" {
  name = var.target_group_name_apps
}

data "aws_cloudwatch_log_group" "step_functions" {
  name = var.log_group_name_step_functions
}

data "aws_iam_policy_document" "combined_ecs_policy" {
  source_policy_documents = [
    templatefile("./aws/policy/s3_policy.json", {
      s3_bucket_name = var.s3_bucket_name
    }),
    templatefile("./aws/policy/ecr_policy.json", {
      aws_region = var.aws_region,
      aws_account_id = var.aws_account_id,
      image_name_etl = var.image_name_etl,
      image_name_dashboard = var.image_name_dashboard
    }),
    file("./aws/policy/ssm_policy.json")
  ]
}

data "aws_iam_policy_document" "step_function_policy" {
  source_policy_documents = [
    templatefile("./aws/policy/step_function_policy.json", {
      ecs_task_execution_role_arn = aws_iam_role.ecs_task_execution.arn,
      ecs_task_role_arn           = aws_iam_role.ecs_task.arn
    })
  ]
}