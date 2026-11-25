import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi nội bộ xảy ra';
    let error = 'Internal Server Error';
    let fieldErrors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        error = (obj.error as string) || error;

        // If ValidationPipe array of errors
        if (Array.isArray(obj.message)) {
          message = 'Dữ liệu không hợp lệ';
          fieldErrors = {
            validation: obj.message as string[],
          };
        }
      }
    } else if (typeof exception === 'object' && exception !== null && 'code' in exception) {
      // Prisma errors handling
      const prismaError = exception as { code: string; meta?: Record<string, unknown> };
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Dữ liệu đã tồn tại hoặc xảy ra xung đột bản ghi';
        error = 'Conflict';
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Không tìm thấy bản ghi yêu cầu';
        error = 'Not Found';
      }
    } else {
      this.logger.error('Unhandled Exception caught by HttpExceptionFilter:', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      ...(fieldErrors ? { fieldErrors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
