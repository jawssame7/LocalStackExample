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
