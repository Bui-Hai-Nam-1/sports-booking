import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { isRecord, type ApiErrorResponse } from '../types/api.types';

/**
 * Global exception filter mapping HttpExceptions and Prisma conflicts to a uniform payload.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const resolved = this.resolveException(exception);

    if (resolved.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.stack : 'Unhandled error',
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode: resolved.statusCode,
      error: resolved.error,
      message: resolved.message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(resolved.statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const rawResponse = exception.getResponse();
      if (typeof rawResponse === 'string') {
        return {
          statusCode,
          error: HttpStatus[statusCode] ?? 'HttpException',
          message: rawResponse,
        };
      }
      if (isRecord(rawResponse)) {
        const rawMessage = rawResponse.message;
        const message = Array.isArray(rawMessage)
          ? rawMessage.map(String)
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message;
        return {
          statusCode,
          error:
            typeof rawResponse.error === 'string'
              ? rawResponse.error
              : (HttpStatus[statusCode] ?? 'HttpException'),
          message,
        };
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002' || exception.code === 'P2034') {
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'Resource state conflict, please retry',
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Requested record was not found',
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    };
  }
}
