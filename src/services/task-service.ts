/**
 * タスク管理サービスクラス
 *
 * このクラスはタスク関連のビジネスロジックを実装し、DynamoDBとの相互作用を担当します。
 * CRUDオペレーションとSQSへのイベント通知機能を提供します。
 */
import { v4 as uuidv4 } from 'uuid';
import { dynamoDb, TASKS_TABLE, sqs, TASKS_QUEUE } from '../utils/aws-clients';
import { Task, TaskStatus } from '../types';

export class TaskService {
  /**
   * タスクを作成する
   *
   * 新しいタスクをDynamoDBに保存し、作成イベントをSQSに送信します。
   *
   * @param title - タスクのタイトル（必須）
   * @param description - タスクの詳細説明（オプション）
   * @returns 作成されたタスクオブジェクト
   *
   * @example
   * const task = await taskService.createTask('LocalStackの設定', 'DockerでLocalStackを起動する');
   */
  async createTask(title: string, description?: string): Promise<Task> {
    const timestamp = new Date().toISOString();

    // タスクオブジェクトを作成
    const task: Task = {
      id: uuidv4(),
      title,
      description,
      status: TaskStatus.TODO,
      createdAt: timestamp,
    };

    // DynamoDBにタスクを保存
    await dynamoDb
      .put({
        TableName: TASKS_TABLE,
        Item: task,
      })
      .promise();

    // SQSにメッセージを送信
    await this.sendTaskMessage(task.id, 'CREATE');

    return task;
  }

  /**
   * タスクをIDで取得する
   *
   * 指定されたIDのタスクをDynamoDBから取得します。
   *
   * @param id - 取得するタスクのID
   * @returns タスクオブジェクト、見つからない場合はnull
   *
   * @example
   * const task = await taskService.getTaskById('123e4567-e89b-12d3-a456-426614174000');
   */
  async getTaskById(id: string): Promise<Task | null> {
    // DynamoDBからタスクを取得
    const result = await dynamoDb
      .get({
        TableName: TASKS_TABLE,
        Key: { id },
      })
      .promise();

    return (result.Item as Task) || null;
  }

  /**
   * すべてのタスクを取得する
   *
   * DynamoDBに保存されているすべてのタスクを取得します。
   *
   * @returns タスクオブジェクトの配列
   *
   * @example
   * const allTasks = await taskService.listTasks();
   */
  async listTasks(): Promise<Task[]> {
    // デバッグ情報を追加
    console.log(`Using DynamoDB table: ${TASKS_TABLE}`);
    console.log(
      `AWS Endpoint: ${
        process.env.AWS_ENDPOINT_URL || process.env.LOCALSTACK_HOSTNAME
          ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
          : 'default'
      }`
    );

    try {
      // DynamoDBからすべてのタスクを取得
      const result = await dynamoDb
        .scan({
          TableName: TASKS_TABLE,
        })
        .promise();

      return (result.Items as Task[]) || [];
    } catch (error) {
      console.error('タスク一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * タスクを更新する
   *
   * 指定されたIDのタスクを更新し、更新イベントをSQSに送信します。
   *
   * @param id - 更新するタスクのID
   * @param updates - タスクの更新内容を含むオブジェクト
   * @returns 更新されたタスクオブジェクト、見つからない場合はnull
   *
   * @example
   * const updatedTask = await taskService.updateTask(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   { status: TaskStatus.IN_PROGRESS, description: '更新された説明' }
   * );
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // 現在のタスクを取得
    const currentTask = await this.getTaskById(id);
    if (!currentTask) {
      return null;
    }

    const timestamp = new Date().toISOString();

    // 更新式を作成
    const updateExpressions: string[] = [];
    const attributeValues: { [key: string]: any } = {};
    const attributeNames: { [key: string]: string } = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :${key}`);
        attributeValues[`:${key}`] = value;
        attributeNames[`#${key}`] = key;
      }
    });

    // タイムスタンプを追加
    updateExpressions.push('#updatedAt = :updatedAt');
    attributeValues[':updatedAt'] = timestamp;
    attributeNames['#updatedAt'] = 'updatedAt';

    // 更新を実行
    await dynamoDb
      .update({
        TableName: TASKS_TABLE,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: attributeValues,
        ExpressionAttributeNames: attributeNames,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    // SQSにメッセージを送信
    await this.sendTaskMessage(id, 'UPDATE');

    // 更新されたタスクを取得
    return await this.getTaskById(id);
  }

  /**
   * タスクを削除する
   *
   * 指定されたIDのタスクを削除し、削除イベントをSQSに送信します。
   *
   * @param id - 削除するタスクのID
   * @returns 削除成功時はtrue、タスクが見つからない場合はfalse
   *
   * @example
   * const deleted = await taskService.deleteTask('123e4567-e89b-12d3-a456-426614174000');
   */
  async deleteTask(id: string): Promise<boolean> {
    // タスクが存在するか確認
    const task = await this.getTaskById(id);
    if (!task) {
      return false;
    }

    // タスクを削除
    await dynamoDb
      .delete({
        TableName: TASKS_TABLE,
        Key: { id },
      })
      .promise();

    // SQSにメッセージを送信
    await this.sendTaskMessage(id, 'DELETE');

    return true;
  }

  /**
   * SQSにタスク関連のメッセージを送信
   *
   * タスクのCRUD操作に関連するイベントメッセージをSQSキューに送信します。
   * イベント駆動型アーキテクチャにおける非同期通知のために使用されます。
   *
   * @param taskId - イベントに関連するタスクのID
   * @param action - イベントの種類（作成、更新、削除）
   * @private
   */
  private async sendTaskMessage(
    taskId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE'
  ): Promise<void> {
    // メッセージオブジェクトを作成
    const message = {
      taskId,
      action,
      timestamp: new Date().toISOString(),
    };

    // SQSにメッセージを送信
    await sqs
      .sendMessage({
        QueueUrl: TASKS_QUEUE,
        MessageBody: JSON.stringify(message),
      })
      .promise();
  }
}
