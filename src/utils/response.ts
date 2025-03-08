/**
 * APIレスポンスユーティリティファイル
 *
 * Lambda関数からのレスポンスを一貫した形式で提供するためのユーティリティ関数を定義します。
 * これにより、すべてのAPIエンドポイントで統一されたレスポンス形式が保証されます。
 */
import { ApiResponse } from '../types';

/**
 * 成功レスポンスを作成する関数
 *
 * 成功時のAPIレスポンスを統一された形式で生成します。
 * レスポンスには適切なCORSヘッダーが含まれており、クロスオリジンリクエストを許可します。
 *
 * @param data - レスポンスボディに含めるデータ
 * @param statusCode - HTTPステータスコード（デフォルト: 200）
 * @returns API Gateway互換の成功レスポンスオブジェクト
 *
 * @example
 * // タスク一覧を返す例
 * return successResponse(tasks, 200);
 *
 * @example
 * // 新規作成したリソースを返す例
 * return successResponse(newResource, 201);
 */
export const successResponse = <T>(
  data: T,
  statusCode: number = 200
): ApiResponse<T> => {
  return {
    statusCode,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  };
};

/**
 * エラーレスポンスを作成する関数
 *
 * エラー発生時のAPIレスポンスを統一された形式で生成します。
 * クライアントに適切なエラーメッセージとステータスコードを返します。
 *
 * @param message - エラーメッセージ
 * @param statusCode - HTTPステータスコード（デフォルト: 500）
 * @returns API Gateway互換のエラーレスポンスオブジェクト
 *
 * @example
 * // クライアントエラー（バリデーションエラー）を返す例
 * return errorResponse('入力データが不正です', 400);
 *
 * @example
 * // サーバーエラーを返す例
 * return errorResponse('内部サーバーエラーが発生しました', 500);
 */
export const errorResponse = (
  message: string,
  statusCode: number = 500
): ApiResponse<{ message: string }> => {
  return {
    statusCode,
    body: JSON.stringify({ message }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  };
};
