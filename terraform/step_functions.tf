resource "aws_sfn_state_machine" "etl_pipeline" {
  name     = "${var.project_name}-etl-pipeline"
  role_arn = aws_iam_role.step_functions.arn

  logging_configuration {
    log_destination        = "${data.aws_cloudwatch_log_group.step_functions.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  definition = templatefile("./aws/step_function_state/hdb_resale_app_etl.json", {
    ecs_cluster         = var.ecs_cluster_name,
    ecs_task_definition = aws_ecs_task_definition.etl.arn
  })

  tags = {
    Component = "etl"
  }
}
