import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

export const lambdaHandler = async (event) => {
  try {
    const processRegisters = event.Records.map(async (record) => {
      const bucket = record.s3.bucket.name;
      const rawKey = record.s3.object.key;
      const key = decodeURIComponent(rawKey.replace(/\+/g, " "));

      // ruta key esperada:  users/{userId}/videos/{videoId}/{videoName}
      const match = key.match(/^users\/([^\/]+)\/videos\/([^\/]+)\//);

      if (!match) {
        console.warn("Key invalido ", key);
        return;
      }

      const userId = match[1];
      const videoId = match[2];

      const videoResponse = await ddb.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            user_id: userId,
            video_id: videoId,
          },
        }),
      );

      if (!videoResponse.Item) {
        console.warn("Video not found in DynamoDB:", { userId, videoId });
        return;
      }

      const video = videoResponse.Item;

      await ddb.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            user_id: userId,
            video_id: videoId,
          },
          UpdateExpression:
            "SET video_status = :status, uploaded_at = :uploadedAt, #b = :bucket",
          ExpressionAttributeNames: {
            "#b": "bucket",
          },
          ExpressionAttributeValues: {
            ":status": "UPLOADED",
            ":uploadedAt": new Date().toISOString(),
            ":bucket": bucket,
          },
        }),
      );

      if (video.options?.transcription?.enabled) {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: process.env.TRANSCRIPTION_QUEUE_URL,
            MessageBody: JSON.stringify({
              task: "TRANSCRIPTION",
              userId,
              videoId,
              bucket,
              videoKey: key,
              videoName: video.video_name,
            }),
          }),
        );

        console.log("Task transcription AWS to SQS ", { userId, videoId });
      }

      console.log("Video marked as UPLOADED:", {
        userId,
        videoId,
        bucket,
        key,
      });
    });

    await Promise.all(processRegisters);
    console.log("Registers - process-video-upload: ", event.Records.length);
  } catch (err) {
    console.error("Error to update video status:", err);
    throw err;
  }
};
