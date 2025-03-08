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

// LocalStackエンドポイントの設定
// AWS_ENDPOINT_URL環境変数を最優先で使用（Lambda内では自動設定される）
// 次にLOCALSTACK_HOSTNAMEを使用（Lambda内では自動設定される）
// 最後にデフォルト値を使用
const getEndpoint = () => {
  if (process.env.AWS_ENDPOINT_URL) {
    return process.env.AWS_ENDPOINT_URL;
  }

  if (process.env.LOCALSTACK_HOSTNAME) {
    return `http://${process.env.LOCALSTACK_HOSTNAME}:4566`;
  }

  return process.env.AWS_ENDPOINT || 'http://localhost:4566';
};

const endpoint = getEndpoint();
const region = process.env.AWS_REGION || 'ap-northeast-1';
// AWS アカウントID (LocalStackでは通常 000000000000 を使用)
const accountId = process.env.AWS_ACCOUNT_ID || '000000000000';

console.log(`AWS Clients using endpoint: ${endpoint}`);

/**
 * AWS SDK共通設定
 * LocalStackとの接続に必要な設定が含まれます。
 * 本番環境では、エンドポイント設定が除外されます。
 */
const awsConfig = {
  region,
  endpoint,
  credentials: new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  }),
} as AWS.ConfigurationOptions;

// 本番環境の場合はLocalStackのエンドポイント設定を削除
if (process.env.STAGE === 'prod' || process.env.NODE_ENV === 'production') {
  // @ts-ignore - 本番環境では削除する
  delete awsConfig.endpoint;
}

/**
 * DynamoDB DocumentClientインスタンス
 * タスクやファイルメタデータの保存・取得に使用します
 */
export const dynamoDb = new AWS.DynamoDB.DocumentClient(awsConfig);

/**
 * S3クライアントインスタンス
 * ファイルのアップロード・ダウンロード操作に使用します
 */
export const s3 = new AWS.S3(awsConfig);

/**
 * SQSクライアントインスタンス
 * メッセージキューの操作に使用します
 */
export const sqs = new AWS.SQS(awsConfig);

/**
 * Lambdaクライアントインスタンス
 * Lambda関数の呼び出しに使用します（サンプルでは未使用）
 */
export const lambda = new AWS.Lambda(awsConfig);

/**
 * API Gatewayクライアントインスタンス
 * API設定の操作に使用します（サンプルでは未使用）
 */
export const apiGateway = new AWS.APIGateway(awsConfig);

/**
 * タスクテーブル名
 * 環境変数から取得するか、デフォルト値を使用します
 */
export const TASKS_TABLE = (() => {
  // ステージ情報をログ出力
  console.log(`NODE_ENV: ${process.env.NODE_ENV}, STAGE: ${process.env.STAGE}`);

  // 明示的にローカル環境の場合はlocalを使用
  const stage =
    process.env.STAGE || (process.env.NODE_ENV === 'local' ? 'local' : 'dev');
  console.log(`Using stage '${stage}' for table names`);

  return process.env.TASKS_TABLE || `tasks-table-${stage}`;
})();

/**
 * ファイルバケット名
 * 環境変数から取得するか、デフォルト値を使用します
 */
export const FILES_BUCKET = (() => {
  const stage =
    process.env.STAGE || (process.env.NODE_ENV === 'local' ? 'local' : 'dev');
  return process.env.FILES_BUCKET || `files-bucket-${stage}`;
})();

/**
 * タスクキューURL
 * 環境変数から取得するか、デフォルト値を使用します
 * キューURLは完全なURLの形式で返します（SQSのsendMessageなどで必要）
 */
export const TASKS_QUEUE = (() => {
  const stage =
    process.env.STAGE || (process.env.NODE_ENV === 'local' ? 'local' : 'dev');
  const queueName = process.env.TASKS_QUEUE || `tasks-queue-${stage}`;

  // 完全なキューURLを構築
  // 本番環境では AWS 標準フォーマット、それ以外では LocalStack 形式
  if (process.env.STAGE === 'prod' || process.env.NODE_ENV === 'production') {
    return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
  } else {
    return `${endpoint}/000000000000/${queueName}`;
  }
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
