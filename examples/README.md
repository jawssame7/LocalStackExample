# LocalStack AWS サービスのサンプルコード

このディレクトリには、LocalStack を使用してローカル環境で AWS サービスを操作するためのサンプルスクリプトが含まれています。

## サンプルの実行方法

各サンプルスクリプトは、以下のコマンドで実行できます：

```bash
# TypeScriptをトランスパイルしてから実行
npm run build
node .build/examples/task-operations.js
node .build/examples/s3-operations.js
node .build/examples/sqs-operations.js

# または ts-nodeを使って直接実行
npx ts-node examples/task-operations.ts
npx ts-node examples/s3-operations.ts
npx ts-node examples/sqs-operations.ts
```

## 前提条件

- LocalStack が実行中であること（`docker-compose up -d`で起動）
- 必要なリソース（DynamoDB テーブル、S3 バケット、SQS キュー）がデプロイされていること（`npm run deploy:local`で作成）

## 含まれるサンプル

### 1. タスク操作 (task-operations.ts)

DynamoDB を使用したタスク管理の基本的な CRUD 操作を示します：

- タスクの作成
- タスクの取得
- タスク一覧の取得
- タスクの更新
- タスクの削除

### 2. ファイル操作 (s3-operations.ts)

S3 バケットを使用したファイル操作の例を示します：

- ファイルのアップロード
- ファイル一覧の取得
- 署名付き URL の生成
- ファイルのダウンロード
- ファイルの削除

### 3. メッセージキュー操作 (sqs-operations.ts)

SQS を使用したメッセージキューの操作例を示します：

- メッセージの送信
- メッセージの受信
- メッセージの処理
- メッセージの削除
- キュー属性の取得

## カスタマイズ

各スクリプトは、ビジネスロジックに合わせて自由にカスタマイズできます。
例えば、タスク管理システムの機能拡張、ファイルストレージの実装、非同期処理のためのワークフローなどに応用できます。

## 注意事項

- これらはサンプルコードであり、本番環境ではより堅牢なエラー処理やセキュリティ対策が必要です。
- AWS SDK の使用方法は本番環境とローカル環境で基本的に同じですが、エンドポイントの設定が異なります。
- スクリプトによって生成される一時ファイルやリソースは、適宜クリーンアップしてください。

# LocalStack での一連の動きを確認する方法

プロジェクトの一連の動きを確認するための手順を説明します。

## セットアップと起動

まず、必要な環境を準備します：

```bash
# 依存パッケージのインストール
npm install

# LocalStackを起動
npm run start

# サーバーレスアプリケーションをLocalStackにデプロイ
npm run deploy:local
```

## 動作確認方法

### 1. サンプルスクリプトを使った動作確認

プロジェクトには各サービスの使用例を示すサンプルスクリプトが含まれています：

```bash
# TypeScriptコードをビルド
npm run build

# サンプルスクリプトを実行
node .build/examples/task-operations.js  # DynamoDBのタスクCRUD操作
node .build/examples/s3-operations.js    # S3のファイル操作
node .build/examples/sqs-operations.js   # SQSのメッセージキュー操作

# または直接TypeScriptを実行
npx ts-node examples/task-operations.ts
npx ts-node examples/s3-operations.ts
npx ts-node examples/sqs-operations.ts
```

これらのスクリプトは各 AWS サービスの基本的な使用方法を示しています。

### 2. API エンドポイントの直接呼び出し

デプロイされた API を直接呼び出して動作確認することもできます：

```bash
# APIエンドポイントの基本情報を取得
curl http://localhost:4566/restapis/[api-id]/local/_user_request_/api

# タスクの作成
curl -X POST http://localhost:4566/restapis/[api-id]/local/_user_request_/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "テストタスク", "description": "LocalStackのテスト"}'

# タスク一覧の取得
curl http://localhost:4566/restapis/[api-id]/local/_user_request_/tasks

# 特定のタスクの取得（idは作成時に返されたものを使用）
curl http://localhost:4566/restapis/[api-id]/local/_user_request_/tasks/[task-id]

# タスクの更新
curl -X PUT http://localhost:4566/restapis/[api-id]/local/_user_request_/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'

# タスクの削除
curl -X DELETE http://localhost:4566/restapis/[api-id]/local/_user_request_/tasks/[task-id]

# ファイルアップロード用のURL生成
curl -X POST http://localhost:4566/restapis/[api-id]/local/_user_request_/files \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.txt", "contentType": "text/plain", "size": 1024}'

# S3バケット内のファイル一覧取得
curl http://localhost:4566/restapis/[api-id]/local/_user_request_/files
```

※ `[api-id]`部分は実際のデプロイ時に生成される API ID に置き換える必要があります。

### 3. AWS CLI を使った動作確認（LocalStack 向け）

AWS CLI を使って各サービスの状態を確認することもできます：

```bash
# LocalStack用のプロファイル設定（初回のみ）
aws configure --profile localstack
# Access Key: test
# Secret Key: test
# Region: ap-northeast-1
# Output Format: json

# エンドポイント指定を簡略化するためのエイリアス設定
alias awslocal='aws --endpoint-url=http://localhost:4566 --profile localstack'

# DynamoDBのテーブル一覧確認
awslocal dynamodb list-tables

# テーブル内のアイテム確認
awslocal dynamodb scan --table-name tasks-table-local

# S3バケット一覧
awslocal s3 ls

# バケット内のファイル一覧
awslocal s3 ls s3://files-bucket-local

# SQSキュー一覧
awslocal sqs list-queues

# キュー属性の確認
awslocal sqs get-queue-attributes --queue-url http://localhost:4566/000000000000/tasks-queue-local --attribute-names All
```

### 4. LocalStack ダッシュボードの利用（オプション）

LocalStack には Web ダッシュボードも用意されています：

```bash
# LocalStack Webダッシュボードのインストール（初回のみ）
pip install localstack-ext

# 環境変数設定
export LOCALSTACK_API_KEY=your_api_key  # Pro版を使用する場合

# ダッシュボード付きでLocalStackを起動
DEBUG=1 localstack start
```

ブラウザで `http://localhost:8080` にアクセスすると、各サービスの状態をグラフィカルに確認できます。

### 5. 全体的なフローの確認

アーキテクチャドキュメント（AWS-ARCHITECTURE.md）に記載された以下のフローを確認できます：

1. **タスク管理フロー**

   - タスク作成 → DynamoDB に保存 → SQS にイベント送信 → 別の Lambda 関数でイベント処理

2. **ファイル管理フロー**

   - 署名付き URL 生成 → S3 へのファイルアップロード → DynamoDB にメタデータ保存

3. **イベント処理フロー**
   - SQS メッセージ送信 → Lambda 関数でイベント処理

これらのフローを実際に試すには、サンプルスクリプトを実行するか、API エンドポイントを順番に呼び出し、LocalStack の各サービスの状態を確認します。

## デバッグとトラブルシューティング

問題が発生した場合のデバッグ方法：

```bash
# LocalStackのログを詳細に表示
docker logs -f localstack_main

# デプロイ状態の確認
npm run serverless -- info --stage local

# 特定の関数を直接実行
npm run invoke:local -- --function apiHandler
npm run invoke:local -- --function createTask --data '{"body": "{\"title\": \"テスト\"}"}'
```

以上の手順で、LocalStack を使用した AWS サービスの連携フローを確認できます。
