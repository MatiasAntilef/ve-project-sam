import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

export const lambdaHandler = async (event, context) => {
  try {
    const videoId = crypto.randomUUID();
    const userId = "test123";

    const body = event.body ? JSON.parse(event.body) : {};
    const videoName = body.name || "Untitled Video";

    const videoKey = `users/${userId}/videos/${videoId}/${videoName}`;

    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.DATA_BUCKET,
        Key: videoKey,
        ContentType: body.contentType || "video/mp4",
      }),
      { expiresIn: 900 },
    );

    const item = {
      user_id: userId,
      video_id: videoId,
      video_name: videoName,
      video_status: "PENDING",
      video_key: videoKey,
      created_at: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: item,
      }),
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Video created successfully",
        videoId: videoId,
        videoKey: videoKey,
        presignedUrl: presignedUrl,
      }),
    };
  } catch (err) {
    console.log(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error creating video",
        error: err.message,
        videoBucket: process.env.DATA_BUCKET ?? "N/A",
        tableName: process.env.TABLE_NAME ?? "N/A",
      }),
    };
  }
};
