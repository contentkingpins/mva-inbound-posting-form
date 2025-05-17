import { APIGatewayProxyResult } from 'aws-lambda';

export const createResponse = (
  statusCode: number,
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

export const successResponse = (data: any): APIGatewayProxyResult => {
  return createResponse(200, data);
};

export const errorResponse = (
  statusCode: number = 500,
  message: string = 'Internal server error'
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    reason: message,
  });
}; 