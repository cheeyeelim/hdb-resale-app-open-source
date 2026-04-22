# --- ECS Task Execution Role (used by ECS agent) ---

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name   = "${var.project_name}-ecs-task-execution-ssm"
  role   = aws_iam_role.ecs_task_execution.id
  policy = file("${path.module}/aws/policy/ssm_policy_ecs_task_execution.json")
}

# --- ECS Task Role (used by the application containers) ---
# This will need more permissions than ECS task execution role

resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${var.project_name}-ecs-task"
  role = aws_iam_role.ecs_task.id

  policy = data.aws_iam_policy_document.combined_ecs_policy.json
}

# --- Step Functions Execution Role ---

resource "aws_iam_role" "step_functions" {
  name = "${var.project_name}-step-functions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "step_functions" {
  name = "${var.project_name}-step-functions"
  role = aws_iam_role.step_functions.id

  policy = data.aws_iam_policy_document.step_function_policy.json
}

# --- IAM Role for EventBridge to invoke Step Functions ---

resource "aws_iam_role" "eventbridge_step_functions" {
  name = "${var.project_name}-eventbridge-sfn"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Component = "etl"
  }
}

resource "aws_iam_role_policy" "eventbridge_step_functions" {
  name = "${var.project_name}-eventbridge-sfn-policy"
  role = aws_iam_role.eventbridge_step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:StartExecution"
        ]
        Resource = [
          aws_sfn_state_machine.etl_pipeline.arn
        ]
      }
    ]
  })
}

# --- IAM Role for Lambda Functions ---

resource "aws_iam_role" "inference_lambda" {
  name = "${var.project_name}-inference-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Component = "inference"
  }
}

resource "aws_iam_role_policy_attachment" "inference_lambda_basic_execution" {
  role       = aws_iam_role.inference_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}