import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const lambdaHandler = async (event) => {
  try {
    const records = event.Records ?? [];

    await Promise.all(
      records.map(async (record) => {
        const rawKey = record.s3.object.key;
        const key = decodeURIComponent(rawKey.replace(/\+/g, " "));

        // ruta key esperada:  transcriptions/{userId}/{videoId}/{videoName}
        const match = key.match(/^transcriptions\/([^\/]+)\/([^\/]+)\//);

        if (!match) {
          console.warn("Invalid transcription key:", key);
          return;
        }

        const userId = match[1];
        const videoId = match[2];

        await ddb.send(
          new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
              user_id: userId,
              video_id: videoId,
            },
            UpdateExpression:
              "SET options.transcription.#status = :status, options.transcription.#key = :key",
            ExpressionAttributeNames: {
              "#status": "status",
              "#key": "key",
            },
            ExpressionAttributeValues: {
              ":status": "COMPLETED",
              ":key": key,
            },
          }),
        );
      }),
    );
  } catch (err) {
    console.error("Error processing completed transcription:", err);
    throw err;
  }
};
