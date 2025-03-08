import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import {
  dynamoDb,
  s3,
  sqs,
  TASKS_TABLE,
  FILES_BUCKET,
  TASKS_QUEUE,
} from '../utils/aws-clients';
import { successResponse, errorResponse } from '../utils/response';

/**
 * API情報を返すハンドラー
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // LocalStackの各サービスへの接続確認
    const services = await checkServices();

    return successResponse({
      message: 'LocalStack AWS サービスAPI',
      stage: process.env.STAGE || 'dev',
      time: new Date().toISOString(),
      requestId: context.awsRequestId,
      path: event.path,
      method: event.httpMethod,
      services,
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    return errorResponse('API処理中にエラーが発生しました', 500);
  }
};

/**
 * 各AWSサービスへの接続を確認する
 */
async function checkServices(): Promise<{
  [key: string]: { status: string; details?: any };
}> {
  const result: { [key: string]: { status: string; details?: any } } = {};

  try {
    // DynamoDBの確認
    const dynamoResult = await dynamoDb
      .scan({
        TableName: TASKS_TABLE,
        Limit: 1,
      })
      .promise()
      .catch((err) => {
        console.error('DynamoDB接続エラー:', err);
        return { error: err.message };
      });

    result.dynamodb = dynamoResult.error
      ? { status: 'error', details: dynamoResult.error }
      : {
          status: 'ok',
          details: { tableExists: true, itemCount: dynamoResult.Count || 0 },
        };

    // S3の確認
    const s3Result = await s3
      .listObjects({
        Bucket: FILES_BUCKET,
        MaxKeys: 1,
      })
      .promise()
      .catch((err) => {
        console.error('S3接続エラー:', err);
        return { error: err.message };
      });

    result.s3 = s3Result.error
      ? { status: 'error', details: s3Result.error }
      : { status: 'ok', details: { bucketExists: true } };

    // SQSの確認
    const sqsResult = await sqs
      .getQueueAttributes({
        QueueUrl: TASKS_QUEUE,
        AttributeNames: ['ApproximateNumberOfMessages'],
      })
      .promise()
      .catch((err) => {
        console.error('SQS接続エラー:', err);
        return { error: err.message };
      });

    result.sqs = sqsResult.error
      ? { status: 'error', details: sqsResult.error }
      : {
          status: 'ok',
          details: {
            queueExists: true,
            messageCount:
              sqsResult.Attributes?.ApproximateNumberOfMessages || 0,
          },
        };
  } catch (error) {
    console.error('サービス確認エラー:', error);
    result.overall = { status: 'error', details: (error as Error).message };
  }

  return result;
}
