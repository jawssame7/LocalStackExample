/**
 * ファイル管理サービスクラス
 *
 * このクラスはS3ストレージとの相互作用を担当し、ファイルの操作とメタデータの管理を行います。
 * ファイルのアップロード、ダウンロード、および削除機能を提供します。
 */
import { v4 as uuidv4 } from 'uuid';
import {
  s3,
  FILES_BUCKET,
  getSignedUrl,
  dynamoDb,
  TASKS_TABLE,
} from '../utils/aws-clients';
import { FileMetadata } from '../types';

export class FileService {
  /**
   * ファイルをアップロードするための署名付きURLを生成する
   *
   * クライアントが直接S3にファイルをアップロードするための時間制限付きURLを生成します。
   * これにより、ファイルがLambda関数を経由せずにS3に直接アップロードされるため、
   * 効率的なファイル転送が可能になります。
   *
   * @param filename - アップロードするファイルの名前
   * @param contentType - ファイルのMIMEタイプ
   * @returns 署名付きURLとファイルIDを含むオブジェクト
   *
   * @example
   * const { url, fileId } = fileService.generateUploadUrl('document.pdf', 'application/pdf');
   */
  generateUploadUrl(
    filename: string,
    contentType: string
  ): { url: string; fileId: string } {
    const fileId = uuidv4();
    const key = `${fileId}/${filename}`;

    const params = {
      Bucket: FILES_BUCKET,
      Key: key,
      Expires: 300, // 5分間有効
      ContentType: contentType,
    };

    const url = getSignedUrl('putObject', params);

    return { url, fileId };
  }

  /**
   * ファイルメタデータを保存する
   *
   * アップロードされたファイルに関するメタデータをDynamoDBに保存します。
   * これにより、ファイルの検索や管理が容易になります。
   *
   * @param fileId - ファイルの一意識別子
   * @param filename - ファイルの名前
   * @param contentType - ファイルのMIMEタイプ
   * @param size - ファイルのサイズ（バイト）
   * @returns 保存されたファイルメタデータオブジェクト
   *
   * @example
   * const metadata = await fileService.saveFileMetadata(
   *   'abc123',
   *   'document.pdf',
   *   'application/pdf',
   *   1024567
   * );
   */
  async saveFileMetadata(
    fileId: string,
    filename: string,
    contentType: string,
    size: number
  ): Promise<FileMetadata> {
    const timestamp = new Date().toISOString();

    const fileUrl = `https://${FILES_BUCKET}.s3.amazonaws.com/${fileId}/${filename}`;
    // LocalStackの場合は別のURLになる
    const localstackUrl = `http://localhost:4566/${FILES_BUCKET}/${fileId}/${filename}`;

    const fileMetadata: FileMetadata = {
      id: fileId,
      filename,
      contentType,
      size,
      uploadedAt: timestamp,
      url: process.env.STAGE === 'local' ? localstackUrl : fileUrl,
    };

    // DynamoDBの専用テーブルに保存するケースもあるが、
    // ここでは簡単のためタスクテーブルに属性として保存する
    await dynamoDb
      .put({
        TableName: TASKS_TABLE,
        Item: {
          id: fileId,
          type: 'FILE',
          ...fileMetadata,
        },
      })
      .promise();

    return fileMetadata;
  }

  /**
   * ファイルメタデータを取得する
   *
   * 特定のファイルIDに関連するメタデータをDynamoDBから取得します。
   *
   * @param fileId - 取得するファイルの一意識別子
   * @returns ファイルメタデータオブジェクト、見つからない場合はnull
   *
   * @example
   * const metadata = await fileService.getFileMetadata('abc123');
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const result = await dynamoDb
      .get({
        TableName: TASKS_TABLE,
        Key: { id: fileId },
      })
      .promise();

    // タイプがFILEのアイテムのみを返す
    if (result.Item && result.Item.type === 'FILE') {
      const { id, filename, contentType, size, uploadedAt, url } = result.Item;
      return { id, filename, contentType, size, uploadedAt, url };
    }

    return null;
  }

  /**
   * ファイルを取得するための署名付きURLを生成する
   *
   * クライアントがS3からファイルをダウンロードするための時間制限付きURLを生成します。
   * これにより、ファイルへの一時的なアクセス権を持つURLが提供されます。
   *
   * @param fileId - ファイルの一意識別子
   * @param filename - ファイルの名前
   * @returns 署名付きダウンロードURL
   *
   * @example
   * const downloadUrl = fileService.getFileUrl('abc123', 'document.pdf');
   */
  getFileUrl(fileId: string, filename: string): string {
    const key = `${fileId}/${filename}`;

    const params = {
      Bucket: FILES_BUCKET,
      Key: key,
      Expires: 3600, // 1時間有効
    };

    return getSignedUrl('getObject', params);
  }

  /**
   * ファイルを削除する
   *
   * S3からファイルを削除し、関連するメタデータもDynamoDBから削除します。
   *
   * @param fileId - 削除するファイルの一意識別子
   * @param filename - 削除するファイルの名前
   * @returns 削除成功時はtrue、失敗時はfalse
   *
   * @example
   * const deleted = await fileService.deleteFile('abc123', 'document.pdf');
   */
  async deleteFile(fileId: string, filename: string): Promise<boolean> {
    const key = `${fileId}/${filename}`;

    try {
      // S3からファイルを削除
      await s3
        .deleteObject({
          Bucket: FILES_BUCKET,
          Key: key,
        })
        .promise();

      // メタデータを削除
      await dynamoDb
        .delete({
          TableName: TASKS_TABLE,
          Key: { id: fileId },
        })
        .promise();

      return true;
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      return false;
    }
  }
}
