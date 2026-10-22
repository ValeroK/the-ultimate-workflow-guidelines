# Skills: architect

Read by `experts.js` only; no model reads this file. One section per stage. The order is the priority when the cap is reached. A line is `- <skill> (<selector>)`; at plan a line has no selector, because a model chooses by each skill's `description`.

## plan

- alarms-and-slos
- lambda-event-sources
- aws-messaging
- api-gateway
- step-functions
- multi-tenancy
- caching-and-latency
- aws-well-architected

## review

- alarms-and-slos (files: *.rules.yml, *.rules.yaml, prometheus-rules*.yaml, alerts*.yaml, alerts*.yml; added: aws_cloudwatch_metric_alarm|aws_cloudwatch_composite_alarm|AWS::CloudWatch::Alarm|AWS::CloudWatch::CompositeAlarm|new (cloudwatch\.)?Alarm\(|new (cloudwatch\.)?CompositeAlarm\(|TreatMissingData|treat_missing_data|treatMissingData|DatapointsToAlarm|datapoints_to_alarm|PutLogAlarm|PrometheusRule|alerting_rules|[Bb]urn.?[Rr]ate|\bSLO\b)
- lambda-event-sources (added: EventSourceMapping|aws_lambda_event_source_mapping|SqsEventSource|KinesisEventSource|DynamoEventSource|ScalingConfig|MaximumConcurrency|maximum_concurrency|ReservedConcurrentExecutions|reserved_concurrent_executions|ProvisionedConcurrency|provisioned_concurrent_executions|BisectBatchOnFunctionError|ReportBatchItemFailures|batchItemFailures|VisibilityTimeout|visibility_timeout_seconds|FilterCriteria|filter_criteria|DeadLetterConfig|dead_letter_config|DestinationConfig)
- aws-messaging (added: AWS::SQS::|AWS::SNS::|AWS::Events::|AWS::EventsV2::|AWS::Kinesis::|aws_sqs_queue|aws_sns_topic|aws_cloudwatch_event_|aws_kinesis_stream|aws-cdk-lib/aws-(sqs|sns|events|kinesis)|aws_cdk\.aws_(sqs|sns|events|kinesis)|RedrivePolicy|redrive_policy|RedriveAllowPolicy|maxReceiveCount|FifoQueue|fifo_queue|ContentBasedDeduplication|MessageDeduplicationId|MessageGroupId|FilterPolicy|filter_policy|SendMessage|send_message|PublishCommand|PutEventsCommand|put_events|PutRecords|put_records|eventsv2)
- step-functions (files: *.asl.json, *.asl.yaml, *.asl.yml; added: AWS::StepFunctions|aws_sfn_state_machine|aws-stepfunctions|aws_stepfunctions|"States\.|StartExecution|StartSyncExecution|[Cc]ompensat|temporalio|go\.temporal\.io/sdk|io\.temporal\.)
- api-gateway (added: AWS::ApiGateway|AWS::ApiGatewayV2|AWS::Serverless::Api|AWS::Serverless::HttpApi|aws_api_gateway_|aws_apigatewayv2_|aws-cdk-lib/aws-apigateway|aws_cdk\.aws_apigateway|TimeoutInMillis|timeout_milliseconds|ThrottlingBurstLimit|throttling_burst_limit|UsagePlan|usage_plan|EndpointConfiguration|endpoint_configuration|CacheClusterEnabled|cache_cluster_enabled|CachingEnabled|caching_enabled|AuthorizerResultTtlInSeconds|authorizer_result_ttl_in_seconds|ProtocolType|protocol_type)
- multi-tenancy (added: [Tt]enant_?[Ii][Dd]|TENANT_ID|tenantKey|tenant_key|[Mm]ulti-?[Tt]enan|ROW LEVEL SECURITY|row level security|CREATE POLICY|create policy|current_setting\('app\.|set_config\('app\.|SET (LOCAL )?app\.|BYPASSRLS|TagSession|PrincipalTag)
- caching-and-latency (added: redis|ioredis|valkey|Redis|Valkey|[Ee]lasti[Cc]ache|AWS::ElastiCache|aws_elasticache_|AWS::CloudFront|aws_cloudfront_|CachePolicy|cache_policy|OriginRequestPolicy|origin_request_policy|FunctionAssociations|function_association|Cache-Control|s-maxage|maxmemory-policy|lru_cache|@cache)
- aws-well-architected (files: *.tf, *.tfvars, template.yaml, template.yml, template.json, serverless.yml, serverless.yaml, cdk.json, samconfig.toml; added: AWS::|resource "aws_|aws-cdk-lib|aws_cdk|@aws-cdk/|boto3|@aws-sdk/|aws-sdk-go|software.amazon.awssdk)
