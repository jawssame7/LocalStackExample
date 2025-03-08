import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { FileService } from '../services/file-service';
import { successResponse, errorResponse } from '../utils/response';

const fileService = new FileService();

/**
 * ファイルアップロード用の署名付きURLを生成するハンドラー
 */
export const upload = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse('リクエストボディがありません', 400);
    }

    const { filename, contentType, size } = JSON.parse(event.body);

    if (!filename || !contentType) {
      return errorResponse('filename と contentType は必須です', 400);
    }

    // 署名付きURLを生成
    const { url, fileId } = fileService.generateUploadUrl(
      filename,
      contentType
    );

    // ファイルのサイズが指定されている場合は、メタデータも保存
    if (size) {
      await fileService.saveFileMetadata(fileId, filename, contentType, size);
    }

    return successResponse({
      uploadUrl: url,
      fileId,
      expires: 300, // 5分
    });
  } catch (error) {
    console.error('署名付きURL生成エラー:', error);
    return errorResponse('署名付きURLの生成中にエラーが発生しました', 500);
  }
};

/**
 * ファイルメタデータを取得するハンドラー
 */
export const get = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const fileId = event.pathParameters?.id;

    if (!fileId) {
      return errorResponse('ファイルIDが指定されていません', 400);
    }

    const fileMetadata = await fileService.getFileMetadata(fileId);

    if (!fileMetadata) {
      return errorResponse('ファイルが見つかりません', 404);
    }

    // ダウンロード用の署名付きURLを生成
    const downloadUrl = fileService.getFileUrl(fileId, fileMetadata.filename);

    return successResponse({
      ...fileMetadata,
      downloadUrl,
    });
  } catch (error) {
    console.error('ファイルメタデータ取得エラー:', error);
    return errorResponse(
      'ファイルメタデータの取得中にエラーが発生しました',
      500
    );
  }
};

/**
 * ファイルを削除するハンドラー
 */
export const remove = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const fileId = event.pathParameters?.id;

    if (!fileId) {
      return errorResponse('ファイルIDが指定されていません', 400);
    }

    // まずファイルのメタデータを取得
    const fileMetadata = await fileService.getFileMetadata(fileId);

    if (!fileMetadata) {
      return errorResponse('ファイルが見つかりません', 404);
    }

    // ファイルを削除
    const deleted = await fileService.deleteFile(fileId, fileMetadata.filename);

    if (!deleted) {
      return errorResponse('ファイルの削除に失敗しました', 500);
    }

    return successResponse({ message: 'ファイルが削除されました' });
  } catch (error) {
    console.error('ファイル削除エラー:', error);
    return errorResponse('ファイルの削除中にエラーが発生しました', 500);
  }
};
