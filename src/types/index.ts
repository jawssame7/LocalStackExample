/**
 * 共通の型定義ファイル
 *
 * このファイルは、アプリケーション全体で使用される共通の型定義を含みます。
 * 各モデルのインターフェース、APIレスポンスの型、メッセージの型などを定義しています。
 */

/**
 * タスクの型定義
 *
 * タスク管理機能で使用されるタスクのデータ構造を定義します。
 * DynamoDBに保存されるデータモデルとして、およびAPIレスポンスとして使用されます。
 */
export interface Task {
  /** タスクの一意識別子 */
  id: string;
  /** タスクのタイトル */
  title: string;
  /** タスクの詳細説明（オプション） */
  description?: string;
  /** タスクの現在のステータス */
  status: TaskStatus;
  /** タスクが作成された日時（ISO 8601形式） */
  createdAt: string;
  /** タスクが最後に更新された日時（ISO 8601形式、オプション） */
  updatedAt?: string;
}

/**
 * タスクのステータスを表す列挙型
 *
 * タスクが取りうる状態を定義します。
 */
export enum TaskStatus {
  /** 未着手状態 */
  TODO = 'TODO',
  /** 進行中状態 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 完了状態 */
  DONE = 'DONE',
}

/**
 * ファイルメタデータの型定義
 *
 * S3に保存されるファイルのメタデータ情報を定義します。
 * DynamoDBに保存され、ファイル操作APIで使用されます。
 */
export interface FileMetadata {
  /** ファイルの一意識別子 */
  id: string;
  /** ファイルの名前 */
  filename: string;
  /** ファイルのMIMEタイプ */
  contentType: string;
  /** ファイルのサイズ（バイト） */
  size: number;
  /** ファイルがアップロードされた日時（ISO 8601形式） */
  uploadedAt: string;
  /** ファイルへのアクセスURL */
  url: string;
}

/**
 * API レスポンスの型定義
 *
 * Lambda関数からAPI Gatewayに返すレスポンス形式を定義します。
 * APIの一貫した応答形式を保証するために使用されます。
 */
export interface ApiResponse<T> {
  /** HTTPステータスコード */
  statusCode: number;
  /** レスポンスボディ（JSON文字列） */
  body: string;
  /** HTTPヘッダー */
  headers: {
    [key: string]: string;
  };
}

/**
 * SQSメッセージの型定義
 *
 * タスク操作に関するイベントをSQSに送信する際のメッセージ形式を定義します。
 * イベント駆動型アーキテクチャにおける非同期通信に使用されます。
 */
export interface TaskMessage {
  /** イベントに関連するタスクのID */
  taskId: string;
  /** イベントのアクション種別 */
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  /** イベントが発生した日時（ISO 8601形式） */
  timestamp: string;
}
