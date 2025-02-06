import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { application } from "@edsc/cdk-utils";

export type CmrStacStackProps = cdk.StackProps;

const logGroupSuffix = "";
const LOG_DESTINATION_ARN = "local-arn";
const STAGE_NAME = "dev";
const SUBNET_ID_A = "local-subnet-a";
const SUBNET_ID_B = "local-subnet-b";
const SUBNET_ID_C = "local-subnet-c";
const VPC_ID = "local-vpc";
const runtime = lambda.Runtime.NODEJS_22_X;
const memorySize = 1024;

// Don't bundle lambda assets since this is the dev stack
const bundling = {
  // Only minify in production
  minify: false,
  externalModules: ["@aws-sdk/*"],
};
/**
 * The AWS CloudFormation template for this Serverless application
 */
export class CmrStacDevStack extends cdk.Stack {
  /**
   * URL of the service endpoint
   */
  public readonly serviceEndpoint;
  /**
   * Current Lambda function version
   */

  public constructor(scope: cdk.App, id: string, props: CmrStacStackProps = {}) {
    super(scope, id, props);

    const environment = {
      CMR_URL: (process.env.CMR_URL = ""),
      CMR_LB_URL: (process.env.CMR_LB_URL = ""),
      GRAPHQL_URL: (process.env.URS_ROOT_URL = ""),
      NODE_ENV: "development",
      STAC_VERSION: "1.0.0",
      LOG_LEVEL: "INFO",
      PAGE_SIZE: "100",
    };

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

    // Get lambda role from application role
    const lambdaRole = iam.Role.fromRoleArn(this, "CmrStacLambdaRole", cmrStacRole.attrArn);

    const vpc = ec2.Vpc.fromVpcAttributes(this, "Vpc", {
      availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"],
      privateSubnetIds: [SUBNET_ID_A, SUBNET_ID_B, SUBNET_ID_C],
      vpcId: VPC_ID,
    });

    const lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "lambdaSecurityGroup",
      "cmrStacLambdaSecurityGroup"
    );

    const defaultLambdaConfig = {
      bundling,
      environment,
      logDestinationArn: LOG_DESTINATION_ARN,
      logGroupSuffix,
      memorySize,
      role: lambdaRole,
      runtime,
      securityGroups: [lambdaSecurityGroup],
      stageName: STAGE_NAME,
      vpc,
    };

    const apiGateway = new application.ApiGateway(this, "ApiGateway", {
      apiName: `${STAGE_NAME}-cmr-stac`,
      stageName: STAGE_NAME,
    });

    const { apiGatewayDeployment, apiGatewayRestApi } = apiGateway;

    new application.NodeJsFunction(this, "StacLambdaFunction", {
      ...defaultLambdaConfig,
      api: {
        apiGatewayDeployment,
        apiGatewayRestApi,
        methods: ["GET", "POST"],
        path: "{proxy+}",
      },
      entry: "../../src/handler.ts",
      functionName: `cmr-stac-api-${STAGE_NAME}`,
    });

    this.serviceEndpoint = [
      "https://",
      apiGatewayRestApi.ref,
      ".execute-api.",
      this.region,
      ".",
      this.urlSuffix,
      `/${STAGE_NAME}`,
    ].join("");

    new cdk.CfnOutput(this, "CfnOutputServiceEndpoint", {
      key: "ServiceEndpoint",
      description: "URL of the service endpoint",
      exportName: `sls-${this.stackName}-ServiceEndpoint`,
      value: this.serviceEndpoint.toString(),
    });
  }
}
