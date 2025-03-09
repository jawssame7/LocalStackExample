/**
 * AWS サービスクライアント設定ファイル
 *
 * このファイルでは、アプリケーションで使用するAWS SDKのクライアントを初期化し、
 * LocalStackとの接続設定を行います。本番環境では自動的に実際のAWSサービスに接続するよう
 * 条件分岐も含まれています。
 */
import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';

// 環境変数をロード
dotenv.config();

// 現在の環境ステージを取得する共通関数
const getStage = (): string => {
  // STAGEが設定されている場合はそれを優先
  if (process.env.STAGE) {
    return process.env.STAGE;
  }
  // STAGE未設定の場合はNODE_ENVを使用
  else if (process.env.NODE_ENV) {
    if (
      process.env.NODE_ENV === 'local' ||
      process.env.NODE_ENV === 'development'
    ) {
      return process.env.NODE_ENV === 'local' ? 'local' : 'dev';
    } else if (process.env.NODE_ENV === 'staging') {
      return 'staging';
    } else if (process.env.NODE_ENV === 'production') {
      return 'prod';
    }
  }
  // デフォルト値
  return 'dev';
};

// 環境変数の判定
const stage = getStage();
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const isLocalStack = !!process.env.LOCALSTACK_HOSTNAME;
const isLocalEnv = stage === 'local' || stage === 'dev';
const isProductionEnv = stage === 'prod' || stage === 'staging';

// 環境情報をログ出力
console.log(
  `環境情報: STAGE=${stage}, isLambda=${isLambda}, isLocalStack=${isLocalStack}, isProductionEnv=${isProductionEnv}`
);
console.log(`NODE_ENV: ${process.env.NODE_ENV}, STAGE: ${process.env.STAGE}`);

// 共通設定とリソース名
const region = process.env.AWS_REGION || 'ap-northeast-1';
const accountId = process.env.AWS_ACCOUNT_ID || '000000000000';
const uniqueSuffix = process.env.UNIQUE_SUFFIX || 'xyz123';

// 型定義
interface ExtendedAWSConfig extends AWS.ConfigurationOptions {
  endpoint?: string;
}

/**
 * 環境に応じたAWS設定を返す関数
 * 各クライアントごとに個別の設定を生成するために使用
 */
function getAwsConfig(
  forceLocalStack = false,
  forceProduction = false
): ExtendedAWSConfig {
  // 強制的に本番設定を使用（Lambda環境ではIS_PRODUCTION=trueが設定されている）
  if (forceProduction || process.env.IS_PRODUCTION === 'true') {
    console.log('強制的に本番環境設定を使用します');
    return { region }; // 標準AWS設定のみ
  }

  // 実際のAWS環境で動作していて、LocalStackモードが強制されていない場合
  if (!isLocalStack && !isLocalEnv && !forceLocalStack) {
    // AWS本番／ステージング環境設定
    console.log('AWS本番環境設定を使用します');
    return { region };
  }

  // LocalStack環境またはローカル開発環境
  const endpoint = process.env.LOCALSTACK_HOSTNAME
    ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
    : 'http://localhost:4566';

  console.log(`LocalStack環境設定を使用します: ${endpoint}`);
  return {
    region,
    endpoint,
    credentials: new AWS.Credentials({
      accessKeyId: 'test',
      secretAccessKey: 'test',
    }),
  };
}

/**
 * DynamoDB DocumentClientインスタンス
 * タスクやファイルメタデータの保存・取得に使用します
 */
export const dynamoDb = new AWS.DynamoDB.DocumentClient(getAwsConfig());

/**
 * S3クライアントインスタンス
 * ファイルのアップロード・ダウンロード操作に使用します
 */
export const s3 = new AWS.S3(getAwsConfig());

/**
 * SQSクライアントインスタンス
 * メッセージキューの操作に使用します
 * SQSは特に本番環境での動作が重要なため、forceProduction=trueを設定
 */
export const sqs = new AWS.SQS(getAwsConfig(false, true));

/**
 * Lambdaクライアントインスタンス
 * Lambda関数の呼び出しに使用します（サンプルでは未使用）
 */
export const lambda = new AWS.Lambda(getAwsConfig());

/**
 * API Gatewayクライアントインスタンス
 * API設定の操作に使用します（サンプルでは未使用）
 */
export const apiGateway = new AWS.APIGateway(getAwsConfig());

/**
 * タスクテーブル名
 * 環境変数から取得するか、デフォルト値を使用します
 */
export const TASKS_TABLE = (() => {
  return process.env.TASKS_TABLE || `tasks-table-${stage}`;
})();

/**
 * ファイルバケット名
 * 環境変数から取得するか、デフォルト値を使用します
 */
export const FILES_BUCKET = (() => {
  // 環境変数から取得するか、デフォルト値を使用（サフィックス付き）
  // serverless.ymlと同じ形式にする
  return process.env.FILES_BUCKET || `files-bucket-${stage}-${uniqueSuffix}`;
})();

/**
 * タスクキューURL
 * 環境変数から取得するか、デフォルト値を使用します
 * キューURLは完全なURLの形式で返します（SQSのsendMessageなどで必要）
 */
export const TASKS_QUEUE = (() => {
  // 明示的に環境変数でキューURLが指定されている場合は最優先
  if (process.env.TASKS_QUEUE_URL) {
    console.log(
      `TASKS_QUEUE_URL環境変数を使用: ${process.env.TASKS_QUEUE_URL}`
    );
    return process.env.TASKS_QUEUE_URL;
  }

  // 本番環境（AWS）で明示的なアカウントIDが指定されている場合
  if (process.env.IS_PRODUCTION === 'true' || process.env.MY_AWS_ACCOUNT_ID) {
    // MY_AWS_ACCOUNT_IDを使用（予約語を避けた環境変数）
    const awsAccountId = process.env.MY_AWS_ACCOUNT_ID || accountId;
    // MY_AWS_REGIONを使用（予約語を避けた環境変数）
    const awsRegion = process.env.MY_AWS_REGION || region;
    const queueName = process.env.TASKS_QUEUE || `tasks-queue-${stage}`;
    const url = `https://sqs.${awsRegion}.amazonaws.com/${awsAccountId}/${queueName}`;
    console.log(`AWS SQSキューURL生成（本番環境）: ${url}`);
    return url;
  }

  // Lambda環境でAWSにデプロイされている場合（本番/ステージング）
  if (isLambda && !isLocalStack) {
    // プロダクション環境では標準AWSキューURLを使用
    const queueName = process.env.TASKS_QUEUE || `tasks-queue-${stage}`;
    const url = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
    console.log(`AWS SQSキューURL生成: ${url}`);
    return url;
  }

  // LocalStack環境または開発環境
  const queueName = process.env.TASKS_QUEUE || `tasks-queue-${stage}`;
  const host =
    isLocalStack && process.env.LOCALSTACK_HOSTNAME
      ? process.env.LOCALSTACK_HOSTNAME
      : 'localhost';

  const url = `http://${host}:4566/000000000000/${queueName}`;
  console.log(`LocalStack SQSキューURL生成: ${url}`);
  return url;
})();

/**
 * S3の署名付きURLを生成する関数
 *
 * 指定された操作（getObject/putObjectなど）とパラメータに基づいて
 * 時間制限付きの署名付きURLを生成します。これにより、認証情報を
 * 共有せずにクライアントがS3と直接やり取りすることが可能になります。
 *
 * @param operation - 実行するS3操作（getObject, putObjectなど）
 * @param params - S3操作のパラメータ
 * @returns 署名付きURL文字列
 */
export const getSignedUrl = (
  operation: string,
  params: AWS.S3.PresignedPost.Params
): string => {
  return s3.getSignedUrl(operation, params);
};
