import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

export const lambdaHandler = async (event, context) => {
  try {
    const videoId = event.pathParameters.videoId;
    const userId = "test123";

    const response = await ddb.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          user_id: userId,
          video_id: videoId,
        },
      }),
    );

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Video not found",
        }),
      };
    }
    const video = response.Item;

    const videoUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: video.video_key,
      }),
      { expiresIn: 60 * 15 },
    );

    response.Item.video_url = videoUrl;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Video retrieved successfully",
        data: {
          video_url: videoUrl,
          ...video,
        },
      }),
    };
  } catch (err) {
    console.log(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting video",
      }),
    };
  }
};
