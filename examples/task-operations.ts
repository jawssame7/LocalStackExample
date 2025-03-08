import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// 環境変数のロード
dotenv.config();

// LocalStackのエンドポイント設定
const endpoint = process.env.AWS_ENDPOINT || 'http://localhost:4566';
const region = process.env.AWS_REGION || 'ap-northeast-1';

// AWS SDK設定
const awsConfig = {
  region,
  endpoint,
  credentials: new AWS.Credentials({
    accessKeyId: 'test',
    secretAccessKey: 'test',
  }),
};

// DynamoDBクライアント
const dynamoDB = new AWS.DynamoDB.DocumentClient(awsConfig);
const TASKS_TABLE = process.env.TASKS_TABLE || 'tasks-table-local';

/**
 * すべてのタスクを取得する
 */
async function listTasks() {
  console.log('タスク一覧を取得中...');

  try {
    const result = await dynamoDB
      .scan({
        TableName: TASKS_TABLE,
      })
      .promise();

    console.log(`${result.Items?.length || 0}件のタスクが見つかりました`);
    console.log(JSON.stringify(result.Items, null, 2));

    return result.Items;
  } catch (error) {
    console.error('タスク一覧取得エラー:', error);
    throw error;
  }
}

/**
 * 新しいタスクを作成する
 */
async function createTask(title: string, description?: string) {
  console.log(`タスクを作成中: ${title}`);

  const timestamp = new Date().toISOString();
  const taskId = uuidv4();

  const task = {
    id: taskId,
    title,
    description,
    status: 'TODO',
    createdAt: timestamp,
  };

  try {
    await dynamoDB
      .put({
        TableName: TASKS_TABLE,
        Item: task,
      })
      .promise();

    console.log(`タスクが作成されました: ${taskId}`);
    return task;
  } catch (error) {
    console.error('タスク作成エラー:', error);
    throw error;
  }
}

/**
 * タスクを更新する
 */
async function updateTask(taskId: string, status: string) {
  console.log(`タスクを更新中: ${taskId} -> ${status}`);

  try {
    const result = await dynamoDB
      .update({
        TableName: TASKS_TABLE,
        Key: { id: taskId },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    console.log(`タスクが更新されました: ${taskId}`);
    console.log(JSON.stringify(result.Attributes, null, 2));

    return result.Attributes;
  } catch (error) {
    console.error('タスク更新エラー:', error);
    throw error;
  }
}

/**
 * タスクを削除する
 */
async function deleteTask(taskId: string) {
  console.log(`タスクを削除中: ${taskId}`);

  try {
    await dynamoDB
      .delete({
        TableName: TASKS_TABLE,
        Key: { id: taskId },
      })
      .promise();

    console.log(`タスクが削除されました: ${taskId}`);
    return true;
  } catch (error) {
    console.error('タスク削除エラー:', error);
    throw error;
  }
}

/**
 * サンプルの実行
 */
async function runExample() {
  try {
    // 既存のタスクを一覧表示
    await listTasks();

    // 新しいタスクを作成
    const task1 = await createTask(
      'LocalStackの設定',
      'DockerコンテナでLocalStackを起動する'
    );
    const task2 = await createTask(
      'Lambda関数を実装',
      'TypeScriptでLambda関数を作成'
    );

    // タスクの一覧を再度取得
    await listTasks();

    // タスクを更新
    await updateTask(task1.id, 'IN_PROGRESS');
    await updateTask(task2.id, 'DONE');

    // 更新後のタスク一覧
    await listTasks();

    // タスクを削除
    await deleteTask(task1.id);

    // 最終的なタスク一覧
    await listTasks();

    console.log('サンプル実行完了');
  } catch (error) {
    console.error('サンプル実行エラー:', error);
  }
}

// サンプルを実行
runExample();
