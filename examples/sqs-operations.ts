import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
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
  credentials: new AWS.Credentials({
    accessKeyId: 'test',
    secretAccessKey: 'test',
  }),
};

// SQSクライアント
const sqs = new AWS.SQS(awsConfig);
const TASKS_QUEUE = `${endpoint}/000000000000/tasks-queue-local`;

/**
 * キュー情報を取得
 */
async function getQueueAttributes() {
  console.log(`キュー ${TASKS_QUEUE} の属性を取得中...`);

  try {
    const result = await sqs
      .getQueueAttributes({
        QueueUrl: TASKS_QUEUE,
        AttributeNames: ['All'],
      })
      .promise();

    console.log('キュー属性:');
    console.log(JSON.stringify(result.Attributes, null, 2));

    return result.Attributes;
  } catch (error) {
    console.error('キュー属性取得エラー:', error);
    throw error;
  }
}

/**
 * メッセージを送信
 */
async function sendMessage(body: any, messageGroupId?: string) {
  console.log(`メッセージを送信中: ${JSON.stringify(body)}`);

  try {
    const params: AWS.SQS.SendMessageRequest = {
      QueueUrl: TASKS_QUEUE,
      MessageBody: JSON.stringify(body),
    };

    // キューがFIFOの場合のみMessageDeduplicationIdとMessageGroupIdを設定
    if (TASKS_QUEUE.endsWith('.fifo')) {
      // FIFOキューの場合のみ設定
      params.MessageDeduplicationId = uuidv4();
      if (messageGroupId) {
        params.MessageGroupId = messageGroupId;
      } else {
        params.MessageGroupId = 'default';
      }
    }

    const result = await sqs.sendMessage(params).promise();
    console.log(`メッセージが送信されました: ${result.MessageId}`);
    return result.MessageId;
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    throw error;
  }
}

/**
 * メッセージを受信
 */
async function receiveMessages(
  maxMessages: number = 10,
  waitTimeSeconds: number = 1
) {
  console.log(`メッセージを受信中 (最大 ${maxMessages} 件)...`);

  try {
    const result = await sqs
      .receiveMessage({
        QueueUrl: TASKS_QUEUE,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      })
      .promise();

    const messages = result.Messages || [];
    console.log(`${messages.length} 件のメッセージを受信しました`);

    for (const message of messages) {
      console.log(`- メッセージID: ${message.MessageId}`);
      console.log(`  本文: ${message.Body}`);
      console.log(`  受信ハンドル: ${message.ReceiptHandle}`);
    }

    return messages;
  } catch (error) {
    console.error('メッセージ受信エラー:', error);
    throw error;
  }
}

/**
 * メッセージを削除
 */
async function deleteMessage(receiptHandle: string) {
  console.log(`メッセージを削除中: ${receiptHandle}`);

  try {
    await sqs
      .deleteMessage({
        QueueUrl: TASKS_QUEUE,
        ReceiptHandle: receiptHandle,
      })
      .promise();

    console.log('メッセージが削除されました');
    return true;
  } catch (error) {
    console.error('メッセージ削除エラー:', error);
    throw error;
  }
}

/**
 * すべてのメッセージを処理
 */
async function processAllMessages() {
  console.log('キュー内のすべてのメッセージを処理中...');

  try {
    let messagesProcessed = 0;
    let batch = await receiveMessages(10, 1);

    while (batch.length > 0) {
      for (const message of batch) {
        // メッセージを処理
        console.log(`メッセージを処理中: ${message.Body}`);

        try {
          // メッセージの本文をJSONとしてパース
          const body = JSON.parse(message.Body || '{}');
          console.log('メッセージ内容:', body);

          // 処理が完了したらメッセージを削除
          await deleteMessage(message.ReceiptHandle || '');
          messagesProcessed++;
        } catch (error) {
          console.error(`メッセージ処理エラー: ${message.MessageId}`, error);
        }
      }

      // 次のバッチを取得
      batch = await receiveMessages(10, 1);
    }

    console.log(`${messagesProcessed} 件のメッセージを処理しました`);
    return messagesProcessed;
  } catch (error) {
    console.error('メッセージ処理エラー:', error);
    throw error;
  }
}

/**
 * サンプルの実行
 */
async function runExample() {
  try {
    // キューの属性を取得
    await getQueueAttributes();

    // タスクメッセージを送信
    for (let i = 1; i <= 5; i++) {
      const taskMessage = {
        taskId: uuidv4(),
        action: i % 3 === 0 ? 'DELETE' : i % 2 === 0 ? 'UPDATE' : 'CREATE',
        timestamp: new Date().toISOString(),
        data: {
          title: `テストタスク ${i}`,
          priority: i,
        },
      };

      await sendMessage(taskMessage);
    }

    // メッセージを受信
    const _messages = await receiveMessages(10, 5);
    console.log('受信したメッセージ:', _messages);

    // すべてのメッセージを処理
    await processAllMessages();

    // 最終的なキュー状態を確認
    await getQueueAttributes();

    console.log('サンプル実行完了');
  } catch (error) {
    console.error('サンプル実行エラー:', error);
  }
}

// サンプルを実行
runExample();
