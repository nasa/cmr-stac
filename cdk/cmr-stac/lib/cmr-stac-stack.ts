import * as cdk from "aws-cdk-lib";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import { Vpc, SecurityGroup } from "aws-cdk-lib/aws-ec2";

export type CmrStacStackProps = cdk.StackProps;

// `logGroupSuffix` is used during the initial migration from serverless to CDK to avoid name conflicts
// const logGroupSuffix = '_cdk'
const logGroupSuffix = "";

const {
  AWS_ORG_ID,
  AWS_ORG_USER,
  CMR_URL = "cmr-local",
  CMR_LB_URL = "cmr-lb-local",
  GRAPHQL_URL = "graphql-local",
  STAC_VERSION = "1.0.0",
  PAGE_SIZE = "100",
  LOG_LEVEL = "INFO",
  LOG_DESTINATION_ARN = "local-arn",
  LISTENER_ARN = "local-listener-arn",
  STAGE_NAME = "dev",
  CMR_SERVICE_SECURITY_GROUP_ID = "local-security-group",
  SUBNET_ID_A = "local-subnet-a",
  SUBNET_ID_B = "local-subnet-b",
  SUBNET_ID_C = "local-subnet-c",
  VPC_ID = "local-vpc",
} = process.env;

const runtime = lambda.Runtime.NODEJS_22_X;
// Default memory size for lambda func
const memorySize = 1024;

// NodeJS bundling options
const bundling = {
  // Only minify in production
  minify: true,
  externalModules: ["@aws-sdk/*"],
};

/**
 * The AWS CloudFormation template for this Serverless application
 */
export class CmrStacStack extends cdk.Stack {
  // public readonly serverlessDeploymentBucketName;
  /**
   * Current Lambda function version
   */
  public readonly stacLambdaFunctionQualifiedArn: string;

  public constructor(scope: cdk.App, id: string, props: CmrStacStackProps = {}) {
    super(scope, id, props);
    const stacLogGroup = new logs.LogGroup(this, `StacLogGroup`, {
      logGroupName: `/aws/lambda/${this.stackName}-stac${logGroupSuffix}`,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    const cmrStacDocsBucket = s3.Bucket.fromBucketName(
      this,
      "cmrStacDocsBucket",
      `cmr-stac-static-bucket-eudoro-${STAGE_NAME}`
    );

    // This maps to the `*` principal
    const iamPrincipalWildcard = new iam.StarPrincipal();
    const cloudOriginPrincipal = new iam.ArnPrincipal(
      `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${AWS_ORG_USER}`
    );

    const bucketPolicy = new iam.PolicyStatement({
      sid: "gsfc-ngap-remediation-org-read-access",
      actions: ["s3:Get*", "s3:List*"],
      resources: [cmrStacDocsBucket.bucketArn, `${cmrStacDocsBucket.bucketArn}/*`],
      effect: iam.Effect.ALLOW,
      principals: [iamPrincipalWildcard],
      conditions: {
        StringEquals: {
          "aws:PrincipalOrgID": AWS_ORG_ID,
        },
      },
    });

    const bucketPolicy2 = new iam.PolicyStatement({
      sid: `gsfc-ngap-remediation-cloudfront-${AWS_ORG_USER}-access`,
      actions: ["s3:Get*", "s3:List*", "s3:Put*"],
      resources: [cmrStacDocsBucket.bucketArn, `${cmrStacDocsBucket.bucketArn}/*`],
      effect: iam.Effect.ALLOW,
      principals: [cloudOriginPrincipal],
    });

    // Attach the bucket policies to the S3 bucket
    cmrStacDocsBucket.addToResourcePolicy(bucketPolicy);
    cmrStacDocsBucket.addToResourcePolicy(bucketPolicy2);

    new s3Deployment.BucketDeployment(this, `cmrStacDocumentation`, {
      destinationBucket: cmrStacDocsBucket,
      sources: [s3Deployment.Source.asset("../../docs/index")],
      include: ["*"],
      cacheControl: [s3Deployment.CacheControl.maxAge(cdk.Duration.days(365))],
      destinationKeyPrefix: "docs/",
      retainOnDelete: true,
      prune: false,
    });

    const cmrStacRole = new iam.CfnRole(this, "cmrStacRole", {
      roleName: `stacRole-${STAGE_NAME}`,
      permissionsBoundary: ["arn:aws:iam::", this.account, ":policy/NGAPShRoleBoundary"].join(""),
      managedPolicyArns: ["arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"],
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: ["lambda.amazonaws.com"],
            },
            Action: ["sts:AssumeRole"],
          },
        ],
      },
    });

    const vpc = Vpc.fromVpcAttributes(this, "Vpc", {
      availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"],
      privateSubnetIds: [SUBNET_ID_A, SUBNET_ID_B, SUBNET_ID_C],
      vpcId: VPC_ID,
    });

    const lambdaSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      "CmrStacSecurityGroup",
      CMR_SERVICE_SECURITY_GROUP_ID
    );

    // Environment variables to pass to application
    const environment = {
      CMR_URL,
      CMR_LB_URL,
      GRAPHQL_URL,
      STAC_VERSION,
      PAGE_SIZE,
      LOG_LEVEL,
    };

    const stacLambdaFunction = new lambdaNodeJs.NodejsFunction(this, `StacLambdaFunction`, {
      bundling,
      architecture: lambda.Architecture.X86_64,
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
      entry: "../../src/handler.ts",
      environment,
      functionName: `${this.stackName}-stac${logGroupSuffix}`,
      handler: "default",
      logGroup: stacLogGroup,
      role: iam.Role.fromRoleArn(this, "CmrStacLambdaRole", cmrStacRole.attrArn),
      memorySize,
      runtime,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      timeout: cdk.Duration.seconds(30),
    });

    new logs.CfnSubscriptionFilter(this, "StacSubscriptionFilter", {
      destinationArn: LOG_DESTINATION_ARN,
      filterPattern: "",
      logGroupName: stacLogGroup.logGroupName,
    });

    const stacLambdaPermissionRegisterTarget = new lambda.CfnPermission(
      this,
      "StacLambdaPermissionRegisterTarget",
      {
        functionName: stacLambdaFunction.functionName,
        action: "lambda:InvokeFunction",
        principal: "elasticloadbalancing.amazonaws.com",
      }
    );

    const stacAlbTargetGroup = new elasticloadbalancingv2.CfnTargetGroup(
      this,
      "StacAlbTargetGroup",
      {
        targetType: "lambda",
        targets: [
          {
            id: stacLambdaFunction.functionArn,
          },
        ],
        tags: [
          {
            key: "Name",
            value: `cmr-stac-api-stac-${STAGE_NAME}`,
          },
        ],
        targetGroupAttributes: [
          {
            key: "lambda.multi_value_headers.enabled",
            value: "false",
          },
        ],
        healthCheckEnabled: false,
      }
    );

    stacAlbTargetGroup.addDependency(stacLambdaPermissionRegisterTarget);

    // Add Alb Listener rules behind the CMR load balancer
    new elasticloadbalancingv2.CfnListenerRule(this, "StacAlbListenerRule500", {
      actions: [
        {
          type: "forward",
          targetGroupArn: stacAlbTargetGroup.ref,
        },
      ],
      conditions: [
        {
          field: "path-pattern",
          values: ["/stac*"],
        },
        {
          field: "http-request-method",
          httpRequestMethodConfig: {
            values: ["GET", "POST", "OPTIONS"],
          },
        },
      ],
      listenerArn: LISTENER_ARN,
      priority: 500,
    });

    new elasticloadbalancingv2.CfnListenerRule(this, "StacAlbListenerRule501", {
      actions: [
        {
          type: "forward",
          targetGroupArn: stacAlbTargetGroup.ref,
        },
      ],
      conditions: [
        {
          field: "path-pattern",
          values: ["/cloudstac*"],
        },
        {
          field: "http-request-method",
          httpRequestMethodConfig: {
            values: ["GET", "POST", "OPTIONS"],
          },
        },
      ],
      listenerArn: LISTENER_ARN,
      priority: 501,
    });

    this.stacLambdaFunctionQualifiedArn = stacLambdaFunction.currentVersion.functionArn;
    new cdk.CfnOutput(this, "CfnOutputStacLambdaFunctionQualifiedArn", {
      key: "StacLambdaFunctionQualifiedArn",
      description: "Current Lambda function version",
      exportName: `sls-${this.stackName}-StacLambdaFunctionQualifiedArn`,
      value: this.stacLambdaFunctionQualifiedArn.toString(),
    });
  }
}
