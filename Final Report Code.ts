import * as cdk from '@aws-cdk/core';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';

export class CdkPipelineProjectStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for storing artifacts
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY // Automatically delete bucket when stack is deleted
    });

    // CodeCommit repository
    const repo = new codecommit.Repository(this, 'JavaProjectRepository', {
      repositoryName: 'java-project',
      description: 'Repository for Java project'
    });

    // IAM role for CodeBuild
    const buildRole = new iam.Role(this, 'CodeBuildServiceRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly')
      ]
    });

    // CodeBuild project
    const buildProject = new codebuild.Project(this, 'JavaProjectBuild', {
      projectName: 'JavaProjectBuild',
      source: codebuild.Source.codeCommit({ repository: repo }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        computeType: codebuild.ComputeType.SMALL
      },
      role: buildRole
    });

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'JavaProjectPipeline', {
      pipelineName: 'JavaProjectPipeline',
      artifactBucket: artifactBucket
    });

    // Pipeline source stage
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'Source',
      repository: repo,
      output: sourceOutput,
      branch: 'master' // default is 'master'
    });

    // Pipeline build stage
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction]
    });
  }
}
