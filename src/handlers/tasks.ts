/**
 * タスク管理APIのLambdaハンドラー
 *
 * このファイルにはタスク管理に関するAPIエンドポイントのハンドラー関数が含まれています。
 * API Gatewayからのリクエストを処理し、TaskServiceを使用してDynamoDBとの相互作用を行います。
 *
 * 提供される機能:
 * - タスクの作成
 * - タスクの取得
 * - タスク一覧の取得
 * - タスクの更新
 * - タスクの削除
 */
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { TaskService } from '../services/task-service';
import { successResponse, errorResponse } from '../utils/response';
import { Task } from '../types';

// TaskServiceのインスタンスを作成
const taskService = new TaskService();

/**
 * タスク作成ハンドラー
 *
 * POST /tasks エンドポイントのハンドラー関数です。
 * リクエストボディからタスク情報を取得し、新しいタスクを作成します。
 *
 * @param event - API Gatewayプロキシイベント
 * @param context - Lambda実行コンテキスト
 * @returns API Gatewayプロキシレスポンス
 *
 * リクエスト例:
 * ```
 * POST /tasks
 * {
 *   "title": "新しいタスク",
 *   "description": "タスクの説明"
 * }
 * ```
 */
export const create = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // リクエストボディの検証
    if (!event.body) {
      return errorResponse('リクエストボディがありません', 400);
    }

    // JSONパースとデータ取得
    const { title, description } = JSON.parse(event.body);

    // タイトルは必須
    if (!title) {
      return errorResponse('タイトルは必須です', 400);
    }

    // タスクを作成
    const task = await taskService.createTask(title, description);

    // 201 Createdステータスで成功レスポンスを返す
    return successResponse(task, 201);
  } catch (error) {
    console.error('タスク作成エラー:', error);
    return errorResponse('タスク作成中にエラーが発生しました', 500);
  }
};

/**
 * タスク取得ハンドラー
 *
 * GET /tasks/{id} エンドポイントのハンドラー関数です。
 * パスパラメータからタスクIDを取得し、対応するタスクを返します。
 *
 * @param event - API Gatewayプロキシイベント
 * @param context - Lambda実行コンテキスト
 * @returns API Gatewayプロキシレスポンス
 *
 * リクエスト例:
 * ```
 * GET /tasks/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
export const get = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // パスパラメータからIDを取得
    const taskId = event.pathParameters?.id;

    // IDがない場合はエラー
    if (!taskId) {
      return errorResponse('タスクIDが指定されていません', 400);
    }

    // タスクを取得
    const task = await taskService.getTaskById(taskId);

    // タスクが見つからない場合は404エラー
    if (!task) {
      return errorResponse('タスクが見つかりません', 404);
    }

    // 成功レスポンスを返す
    return successResponse(task);
  } catch (error) {
    console.error('タスク取得エラー:', error);
    return errorResponse('タスク取得中にエラーが発生しました', 500);
  }
};

/**
 * タスク一覧取得ハンドラー
 *
 * GET /tasks エンドポイントのハンドラー関数です。
 * 保存されているすべてのタスクを返します。
 *
 * @param event - API Gatewayプロキシイベント
 * @param context - Lambda実行コンテキスト
 * @returns API Gatewayプロキシレスポンス
 *
 * リクエスト例:
 * ```
 * GET /tasks
 * ```
 */
export const list = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // すべてのタスクを取得
    const tasks = await taskService.listTasks();

    // 成功レスポンスを返す
    return successResponse(tasks);
  } catch (error) {
    console.error('タスク一覧取得エラー:', error);
    return errorResponse('タスク一覧取得中にエラーが発生しました', 500);
  }
};

/**
 * タスク更新ハンドラー
 *
 * PUT /tasks/{id} エンドポイントのハンドラー関数です。
 * パスパラメータからタスクIDを取得し、リクエストボディの内容でタスクを更新します。
 *
 * @param event - API Gatewayプロキシイベント
 * @param context - Lambda実行コンテキスト
 * @returns API Gatewayプロキシレスポンス
 *
 * リクエスト例:
 * ```
 * PUT /tasks/123e4567-e89b-12d3-a456-426614174000
 * {
 *   "status": "IN_PROGRESS",
 *   "description": "更新された説明"
 * }
 * ```
 */
export const update = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // パスパラメータからIDを取得
    const taskId = event.pathParameters?.id;

    // IDがない場合はエラー
    if (!taskId) {
      return errorResponse('タスクIDが指定されていません', 400);
    }

    // リクエストボディの検証
    if (!event.body) {
      return errorResponse('リクエストボディがありません', 400);
    }

    // JSONパースと更新データの取得
    const updates: Partial<Task> = JSON.parse(event.body);

    // IDと作成日の更新は許可しない
    delete updates.id;
    delete updates.createdAt;

    // タスクを更新
    const updatedTask = await taskService.updateTask(taskId, updates);

    // タスクが見つからない場合は404エラー
    if (!updatedTask) {
      return errorResponse('タスクが見つかりません', 404);
    }

    // 成功レスポンスを返す
    return successResponse(updatedTask);
  } catch (error) {
    console.error('タスク更新エラー:', error);
    return errorResponse('タスク更新中にエラーが発生しました', 500);
  }
};

/**
 * タスク削除ハンドラー
 *
 * DELETE /tasks/{id} エンドポイントのハンドラー関数です。
 * パスパラメータからタスクIDを取得し、対応するタスクを削除します。
 *
 * @param event - API Gatewayプロキシイベント
 * @param context - Lambda実行コンテキスト
 * @returns API Gatewayプロキシレスポンス
 *
 * リクエスト例:
 * ```
 * DELETE /tasks/123e4567-e89b-12d3-a456-426614174000
 * ```
 */
export const remove = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // パスパラメータからIDを取得
    const taskId = event.pathParameters?.id;

    // IDがない場合はエラー
    if (!taskId) {
      return errorResponse('タスクIDが指定されていません', 400);
    }

    // タスクを削除
    const deleted = await taskService.deleteTask(taskId);

    // タスクが見つからない場合は404エラー
    if (!deleted) {
      return errorResponse('タスクが見つかりません', 404);
    }

    // 成功レスポンスを返す
    return successResponse({ message: 'タスクが削除されました' });
  } catch (error) {
    console.error('タスク削除エラー:', error);
    return errorResponse('タスク削除中にエラーが発生しました', 500);
  }
};
