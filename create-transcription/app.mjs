import {
  TranscribeClient,
  StartTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const transcribe = new TranscribeClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const lambdaHandler = async (event) => {
  console.log("SQS event:", JSON.stringify(event, null, 2));

  try {
    const records = event.Records ?? [];

    await Promise.all(
      records.map(async (record) => {
        const message = JSON.parse(record.body);

        const { task, userId, videoId, bucket, videoKey, videoName } = message;

        if (task !== "TRANSCRIPTION") {
          console.warn("Invalid task for create-transcription:", task);
          return;
        }

        const jobName = `ve-${userId}-${videoId}`.replace(
          /[^0-9a-zA-Z._-]/g,
          "-",
        );
        const outputKey = `users/${userId}/transcriptions/${videoId}/${videoName}.json`;

        await ddb.send(
          new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
              user_id: userId,
              video_id: videoId,
            },
            UpdateExpression:
              "SET options.transcription.#status = :status, updated_at = :updatedAt",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":status": "IN_PROGRESS",
              ":updatedAt": new Date().toISOString(),
            },
          }),
        );

        await transcribe.send(
          new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName,
            LanguageCode: "es-ES",
            Media: {
              MediaFileUri: `s3://${bucket}/${videoKey}`,
            },
            OutputBucketName: bucket,
            OutputKey: outputKey,
          }),
        );
      }),
    );
  } catch (err) {
    console.error("Error creating transcription:", err);
    throw err;
  }
};
