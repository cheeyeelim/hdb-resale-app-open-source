# --- EventBridge Scheduler for ETL Pipeline ---

resource "aws_scheduler_schedule" "etl_schedule" {
  name                = "${var.project_name}-etl-schedule"
  description         = "Trigger the ETL Step Function monthly on the midnight of first Sunday"
  group_name          = var.scheduler_group_name
  schedule_expression = "cron(0 0 ? * 1#1 *)"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 30
  }

  target {
    arn      = aws_sfn_state_machine.etl_pipeline.arn
    role_arn = aws_iam_role.eventbridge_step_functions.arn

    retry_policy {
      maximum_event_age_in_seconds = 86400
      maximum_retry_attempts       = 3
    }
  }
}
