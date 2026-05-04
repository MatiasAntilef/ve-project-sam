import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Video retrieved successfully",
        data: response.Item,
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
