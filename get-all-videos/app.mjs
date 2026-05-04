import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const lambdaHandler = async (event, context) => {
  try {
    const userId = "test123";

    const response = await ddb.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      }),
    );

    if (!response.Items || response.Items.length === 0) {
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
        data: response.Items,
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
