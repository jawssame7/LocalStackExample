import { SQSEvent, Context, SQSRecord } from 'aws-lambda';
import { TaskService } from '../services/task-service';
import { TaskMessage } from '../types';

const taskService = new TaskService();

/**
 * SQSメッセージを処理するハンドラー
 */
export const process = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  try {
    console.log(`SQSイベント受信: ${event.Records.length}件のメッセージ`);

    for (const record of event.Records) {
      await processRecord(record);
    }
  } catch (error) {
    console.error('SQSメッセージ処理エラー:', error);
    throw error; // Lambda関数を失敗させてSQSにメッセージを戻す
  }
};

/**
 * 個々のSQSレコードを処理する
 */
async function processRecord(record: SQSRecord): Promise<void> {
  try {
    console.log(`メッセージ処理: ${record.messageId}`);

    const message: TaskMessage = JSON.parse(record.body);
    console.log(`タスクメッセージ: ${JSON.stringify(message)}`);

    const { taskId, action, timestamp } = message;

    switch (action) {
      case 'CREATE':
        await handleTaskCreated(taskId, timestamp);
        break;
      case 'UPDATE':
        await handleTaskUpdated(taskId, timestamp);
        break;
      case 'DELETE':
        await handleTaskDeleted(taskId, timestamp);
        break;
      default:
        console.warn(`不明なアクション: ${action}`);
    }
  } catch (error) {
    console.error(`レコード処理エラー: ${record.messageId}`, error);
    throw error; // 上位関数に再スロー
  }
}

/**
 * タスク作成時の処理
 */
async function handleTaskCreated(
  taskId: string,
  timestamp: string
): Promise<void> {
  console.log(`タスク作成イベント処理: ${taskId}, 時刻: ${timestamp}`);
  // ここに追加の処理を実装
  // 例: 通知を送信、統計を更新など
}

/**
 * タスク更新時の処理
 */
async function handleTaskUpdated(
  taskId: string,
  timestamp: string
): Promise<void> {
  console.log(`タスク更新イベント処理: ${taskId}, 時刻: ${timestamp}`);

  // タスクのステータスを確認
  const task = await taskService.getTaskById(taskId);

  if (task) {
    console.log(`タスクステータス: ${task.status}`);

    // タスクが完了状態の場合の処理
    if (task.status === 'DONE') {
      console.log(`タスク ${taskId} が完了しました。追加の処理を実行します...`);
      // 完了時の処理をここに実装
    }
  } else {
    console.warn(`タスク ${taskId} が見つかりません`);
  }
}

/**
 * タスク削除時の処理
 */
async function handleTaskDeleted(
  taskId: string,
  timestamp: string
): Promise<void> {
  console.log(`タスク削除イベント処理: ${taskId}, 時刻: ${timestamp}`);
  // ここに削除時の処理を実装
  // 例: 関連リソースのクリーンアップなど
}
