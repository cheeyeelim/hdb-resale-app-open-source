# --- ETL Task Definition (used by all 4 steps, overridden via container command) ---

resource "aws_ecs_task_definition" "etl" {
  family                   = "${var.project_name}-etl"
  requires_compatibilities = ["EC2"]
  network_mode             = "bridge"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "etl"
      image     = "${var.ecr_registry}/${var.image_name_etl}:${var.image_version_etl}"
      memory    = 2048
      essential = true

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name_etl
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "etl"
        }
      }
    }
  ])

  tags = {
    Component = "etl"
  }
}

# --- Dashboard Task Definition ---

resource "aws_ecs_task_definition" "dashboard" {
  family                   = "${var.project_name}-dashboard"
  requires_compatibilities = ["EC2"]
  network_mode             = "bridge"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "dashboard"
      image     = "${var.ecr_registry}/${var.image_name_dashboard}:${var.image_version_dashboard}"
      memory    = 1024
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 0 # Dynamic port mapping: ECS assigns a random ephemeral host port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = [
        {
          name      = "INFERENCE_API_URL"
          valueFrom = aws_ssm_parameter.hdb_resale_inference_api_url.arn
        },
        {
          name      = "NODE_ENV"
          valueFrom = aws_ssm_parameter.hdb_resale_node_env.arn
        },
        {
          name      = "HOSTNAME"
          valueFrom = aws_ssm_parameter.hdb_resale_hostname.arn
        },
        {
          name      = "PORT"
          valueFrom = aws_ssm_parameter.hdb_resale_port.arn
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name_dashboard
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "dashboard"
        }
      }
    }
  ])

  tags = {
    Component = "dashboard"
  }
}

# =============================================================================
# ECS Service for Dashboard
# =============================================================================

resource "aws_ecs_service" "dashboard" {
  name                               = "${var.project_name}-dashboard"
  cluster                            = var.ecs_cluster_name
  task_definition                    = aws_ecs_task_definition.dashboard.arn
  desired_count                      = 1
  enable_execute_command             = true
  deployment_minimum_healthy_percent = 100 # Keep old task running until new one is healthy
  deployment_maximum_percent         = 200 # Allow new task to start before old one stops
  #force_new_deployment = true

  capacity_provider_strategy {
    capacity_provider = var.ecs_capacity_provider_name
    weight            = 1
    base              = 1
  }

  load_balancer {
    target_group_arn = data.aws_lb_target_group.dashboard.arn
    container_name   = "dashboard"
    container_port   = 3000
  }

  tags = {
    Component = "dashboard"
  }
}
