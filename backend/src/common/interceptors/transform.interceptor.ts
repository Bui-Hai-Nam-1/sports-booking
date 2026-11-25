import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T> | T> {
    const http = context.switchToHttp();
    const response = http.getResponse();

    return next.handle().pipe(
      map((result) => {
        // Preserve responses that are already wrapped by a controller.
        if (result && typeof result === 'object' && 'success' in result) {
          return result;
        }

        // StreamableFile applies its headers when Nest sends the response, so
        // checking response headers here is not sufficient on its own.
        if (result instanceof StreamableFile) {
          return result;
        }

        // Do not wrap other file downloads with an explicit disposition.
        if (response.getHeader && response.getHeader('Content-Disposition')) {
          return result;
        }

        // Keep the complete service payload (including items, total, page, and
        // totalPages) under data so API clients do not lose pagination fields.
        return {
          success: true,
          data: result,
        };
      }),
    );
  }
}
