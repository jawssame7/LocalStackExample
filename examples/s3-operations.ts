import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
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
  s3ForcePathStyle: true, // LocalStackで必要
  credentials: new AWS.Credentials({
    accessKeyId: 'test',
    secretAccessKey: 'test',
  }),
};

// S3クライアント
const s3 = new AWS.S3(awsConfig);
const FILES_BUCKET = process.env.FILES_BUCKET || 'files-bucket-local';

/**
 * バケット内のファイルを一覧表示
 */
async function listFiles() {
  console.log(`バケット [${FILES_BUCKET}] のファイルを一覧表示中...`);

  try {
    const result = await s3
      .listObjects({
        Bucket: FILES_BUCKET,
      })
      .promise();

    console.log(`${result.Contents?.length || 0}個のファイルが見つかりました`);

    if (result.Contents && result.Contents.length > 0) {
      for (const file of result.Contents) {
        console.log(
          `- ${file.Key} (${file.Size} bytes, 最終更新: ${file.LastModified})`
        );
      }
    }

    return result.Contents;
  } catch (error) {
    console.error('ファイル一覧取得エラー:', error);
    throw error;
  }
}

/**
 * ファイルをアップロード
 */
async function uploadFile(filePath: string, key?: string) {
  const filename = path.basename(filePath);
  const fileKey = key || `uploads/${uuidv4()}/${filename}`;

  console.log(`ファイルをアップロード中: ${filename} -> ${fileKey}`);

  try {
    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: FILES_BUCKET,
      Key: fileKey,
      Body: fileContent,
      ContentType: getContentType(filename),
    };

    await s3.putObject(params).promise();

    console.log(`ファイルがアップロードされました: ${fileKey}`);
    return fileKey;
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    throw error;
  }
}

/**
 * ファイルをダウンロード
 */
async function downloadFile(fileKey: string, outputPath: string) {
  console.log(`ファイルをダウンロード中: ${fileKey}`);

  try {
    const result = await s3
      .getObject({
        Bucket: FILES_BUCKET,
        Key: fileKey,
      })
      .promise();

    if (result.Body instanceof Buffer) {
      fs.writeFileSync(outputPath, result.Body as Buffer);
    } else if (result.Body) {
      fs.writeFileSync(outputPath, result.Body.toString());
    } else {
      throw new Error('ファイル本体が空です');
    }

    console.log(`ファイルがダウンロードされました: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('ファイルダウンロードエラー:', error);
    throw error;
  }
}

/**
 * 署名付きURLを生成
 */
function generateSignedUrl(fileKey: string, expiresInSeconds: number = 60) {
  console.log(
    `署名付きURLを生成中: ${fileKey} (有効期間: ${expiresInSeconds}秒)`
  );

  try {
    const url = s3.getSignedUrl('getObject', {
      Bucket: FILES_BUCKET,
      Key: fileKey,
      Expires: expiresInSeconds,
    });

    console.log(`署名付きURL: ${url}`);
    return url;
  } catch (error) {
    console.error('署名付きURL生成エラー:', error);
    throw error;
  }
}

/**
 * ファイルを削除
 */
async function deleteFile(fileKey: string) {
  console.log(`ファイルを削除中: ${fileKey}`);

  try {
    await s3
      .deleteObject({
        Bucket: FILES_BUCKET,
        Key: fileKey,
      })
      .promise();

    console.log(`ファイルが削除されました: ${fileKey}`);
    return true;
  } catch (error) {
    console.error('ファイル削除エラー:', error);
    throw error;
  }
}

/**
 * ファイル名からContent-Typeを推測
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * サンプルの実行
 */
async function runExample() {
  try {
    // サンプルファイルを作成
    const sampleDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }

    const sampleFilePath = path.join(sampleDir, 'sample.txt');
    fs.writeFileSync(
      sampleFilePath,
      'これはLocalStackでS3テスト用のサンプルファイルです。'
    );

    // バケット内の既存ファイル一覧
    await listFiles();

    // ファイルをアップロード
    const uploadedFileKey = await uploadFile(sampleFilePath);

    // 更新後のファイル一覧
    await listFiles();

    // 署名付きURLを生成
    const signedUrl = generateSignedUrl(uploadedFileKey, 300);
    console.log(`生成された署名付きURL: ${signedUrl}`);

    // ファイルをダウンロード
    const downloadedFilePath = path.join(sampleDir, 'downloaded-sample.txt');
    await downloadFile(uploadedFileKey, downloadedFilePath);

    // ファイルを削除
    await deleteFile(uploadedFileKey);

    // 最終的なファイル一覧
    await listFiles();

    console.log('サンプル実行完了');
  } catch (error) {
    console.error('サンプル実行エラー:', error);
  }
}

// サンプルを実行
runExample();
