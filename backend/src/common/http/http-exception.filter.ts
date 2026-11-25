import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const httpResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let message: string | string[];
    if (typeof httpResponse === 'string') {
      message = httpResponse;
    } else if (
      typeof httpResponse === 'object' &&
      httpResponse !== null &&
      'message' in httpResponse
    ) {
      const candidate = (httpResponse as { message?: string | string[] })
        .message;
      message =
        typeof candidate === 'string' || Array.isArray(candidate)
          ? candidate
          : 'Request failed';
    } else {
      message = 'Request failed';
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode: status,
      error:
        typeof httpResponse === 'object' &&
        httpResponse !== null &&
        'error' in httpResponse &&
        typeof (httpResponse as { error?: unknown }).error === 'string'
          ? (httpResponse as { error: string }).error
          : HttpStatus[status] ?? 'Error',
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };
    response.status(status).json(body);
  }
}
