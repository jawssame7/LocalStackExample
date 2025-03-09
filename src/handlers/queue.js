/**
 * SQSキューからメッセージを処理するハンドラー
 */
export const process = async (event, context) => {
  try {
    console.log('SQSメッセージ処理開始');

    // メッセージが含まれているかチェック
    if (!event.Records || event.Records.length === 0) {
      console.log('処理するメッセージがありません');
      return { statusCode: 200, body: 'No messages to process' };
    }

    // 各メッセージを処理
    for (const record of event.Records) {
      console.log(`メッセージ処理: ${record.messageId}`);
      const body = JSON.parse(record.body);
      console.log(`メッセージ内容: ${JSON.stringify(body)}`);

      // メッセージ処理ロジックをここに追加

      console.log(`メッセージ処理完了: ${record.messageId}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'メッセージ処理完了' }),
    };
  } catch (error) {
    console.error(`キュー処理エラー: ${error.message}`, error);
    throw error;
  }
};
