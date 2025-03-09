# LocalStack AWS サービスサンプルプロジェクト

このプロジェクトは LocalStack を使用して、ローカル環境で AWS サービスをエミュレートする TypeScript ベースのサンプルアプリケーションです。

## 含まれる AWS サービス

- API Gateway - RESTful API エンドポイントの提供
- Lambda - サーバーレス関数の実行
- S3 - ファイルストレージ
- SQS - メッセージキュー
- DynamoDB - NoSQL データベース

## セットアップ方法

### 前提条件

- Node.js 18 以上
- npm または yarn
- Docker
- Docker Compose
- AWS CLI

### インストール

1. リポジトリをクローン:

```
git clone <repository-url>
cd LocalStackExample
```

2. 依存パッケージをインストール:

```
npm install
# または
yarn install
```

3. LocalStack を起動:

```
npm run start
# または
yarn start
```

4. サーバーレスアプリケーションをローカルにデプロイ:

```
npm run deploy:local
# または
yarn deploy:local
```

## デプロイ方法

### ローカル環境（LocalStack）へのデプロイ

ローカル開発環境では、LocalStack を使用して AWS サービスをエミュレートします。

1. 環境変数の設定：

`.env`ファイルで開発環境用の設定を有効にします：

```
# LocalStack設定
LOCALSTACK_HOSTNAME=localhost
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=ap-northeast-1

# AWS認証情報（LocalStackでは実際には使用されませんが、AWSSDKには必要です）
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# アプリケーション設定
NODE_ENV=development
STAGE=dev

# 本番環境用の設定（コメントアウト）
# AWS_REGION=ap-northeast-1
# NODE_ENV=staging
# STAGE=staging
```

2. LocalStack コンテナの起動：

```bash
docker-compose up -d
```

3. ローカル環境へのデプロイ実行：

```bash
npm run deploy:local
# または
serverless deploy --stage local
```

### AWS 環境へのデプロイ

実際の AWS 環境へのデプロイは、以下のステップで行います。

#### 開発環境（dev）

```bash
npm run deploy:dev
# または
serverless deploy --stage dev
```

#### ステージング環境（staging）

```bash
npm run deploy:staging
# または
serverless deploy --stage staging
```

#### 本番環境（prod）

```bash
npm run deploy:prod
# または
serverless deploy --stage prod
```

### 特定のリソースのみデプロイ/スキップ

特定のリソースをスキップしてデプロイする場合：

```bash
# S3バケットをスキップしてデプロイ
serverless deploy --stage staging --skip-files-bucket true

# DynamoDBテーブルをスキップしてデプロイ
serverless deploy --stage staging --skip-tasks-table true

# 複数のリソースをスキップしてデプロイ
serverless deploy --stage staging --skip-files-bucket true --skip-tasks-table true
```

### デプロイトラブルシューティング

1. **リソースが既に存在する場合**

AWS 上で既存リソースと競合する場合、該当リソースをスキップします：

```bash
serverless deploy --stage staging --skip-files-bucket true
```

2. **CloudFormation スタックエラー**

エラー時に CloudFormation スタックを修復するには、コンソールからスタックを削除し、再デプロイします。または：

```bash
aws cloudformation delete-stack --stack-name localstack-aws-example-staging
```

3. **削除ポリシー**

本番/ステージング環境ではリソースの`DeletionPolicy`が`Retain`に設定されており、CloudFormation スタックが削除されてもリソースは保持されます。

## AWS リソースの削除方法

AWS へデプロイしたリソースを削除するには、以下の方法があります：

### 1. Serverless Framework を使った削除（推奨）

Serverless Framework のコマンドを使用すると、デプロイしたスタック全体を簡単に削除できます：

```bash
# ステージング環境のスタックを削除
npm run remove:staging
# または
npx serverless remove --stage staging

# 開発環境のスタックを削除
npm run remove:dev
# または
npx serverless remove --stage dev

# 本番環境のスタックを削除
npm run remove:prod
# または
npx serverless remove --stage prod
```

npx を使うことで、グローバルインストールされていない Serverless でも実行できます。

### 2. 特定のリソースを保持して削除する場合

リソースの`DeletionPolicy`が`Retain`に設定されている場合（本番/ステージング環境のデフォルト）、CloudFormation スタックを削除してもそれらのリソースは保持されます。これにより、重要なデータを含むリソースを誤って削除することを防ぎます。

```yaml
# serverless.ymlの設定例
Resources:
  TasksTable:
    Type: AWS::DynamoDB::Table
    DeletionPolicy: ${self:custom.deletionPolicy, 'Delete'}
    # ...
```

### 3. AWS 管理コンソールから削除する方法

AWS コンソールからも削除できます：

1. CloudFormation コンソールにアクセス
2. スタック「localstack-aws-example-[stage]」を選択
3. 「削除」ボタンをクリック
4. 削除を確認

### 4. AWS CLI を使用した削除

AWS CLI を使用して、コマンドラインから削除することもできます：

```bash
aws cloudformation delete-stack --stack-name localstack-aws-example-staging --region ap-northeast-1
```

### 注意事項

- **データ損失の可能性**：削除を実行すると、DynamoDB のデータや S3 のファイルなども削除されます。必要なデータはバックアップを取っておいてください。
- **保持されるリソース**：`DeletionPolicy: Retain`が設定されているリソースは、スタック削除後も残ります。これらは別途手動で削除する必要があります。
- **IAM リソース**：IAM ロールやポリシーが他のリソースから参照されている場合、削除できないことがあります。

### 個別リソースの手動削除

特定のリソースだけを手動で削除する場合は、AWS コンソールから行えます：

- **S3 バケット**: S3 コンソールから`files-bucket-[stage]-xyz123`を検索して削除
- **DynamoDB テーブル**: DynamoDB コンソールから`tasks-table-[stage]`を検索して削除
- **SQS キュー**: SQS コンソールから`tasks-queue-[stage]`を検索して削除

## 使用方法

各サービスの使用例については、`examples`ディレクトリ内のスクリプトを参照してください。

## プロジェクト構造

```
.
├── docker-compose.yml        # LocalStackの設定
├── package.json              # npmパッケージ設定
├── tsconfig.json             # TypeScript設定
├── serverless.yml            # サーバーレス設定
├── src/
│   ├── handlers/             # Lambdaハンドラー関数
│   ├── models/               # データモデル
│   ├── services/             # サービスレイヤー
│   ├── utils/                # ユーティリティ関数
│   └── types/                # カスタム型定義
└── examples/                 # 各サービスの使用例
```

## 開発

### ビルド

```
npm run build
# または
yarn build
```

### テスト

```
npm test
# または
yarn test
```

### 関数をローカルで実行

```
npm run invoke:local -- --function functionName
# または
yarn invoke:local --function functionName
```

## ライセンス

MIT
