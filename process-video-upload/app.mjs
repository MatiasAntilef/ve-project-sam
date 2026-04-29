import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const lambdaHandler = async (event) => {
  try {
    console.log("S3 event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const rawKey = record.s3.object.key;
      const key = decodeURIComponent(rawKey.replace(/\+/g, " "));

      // key esperado:
      // users/test123/videos/<videoId>/<videoName>
      const parts = key.split("/");

      const userId = parts[1];
      const videoId = parts[3];

      if (!userId || !videoId) {
        console.warn("Invalid key format:", key);
        continue;
      }

      await ddb.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            user_id: userId,
            video_id: videoId,
          },
          UpdateExpression:
            "SET video_status = :status, uploaded_at = :uploadedAt, bucket = :bucket",
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
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Upload processed",
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing upload",
        error: err.message,
      }),
    };
  }
};
