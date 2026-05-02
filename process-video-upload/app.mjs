import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const lambdaHandler = async (event) => {
  console.log("S3 event:", JSON.stringify(event, null, 2));
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

      console.log("Video marked as UPLOADED:", {
        userId,
        videoId,
        bucket,
        key,
      });
    });

    await Promise.all(processRegisters);
    console.log("Registers -", event.Records.length);
  } catch (err) {
    console.error("Error to update video status:", err);
    throw err;
  }
};
