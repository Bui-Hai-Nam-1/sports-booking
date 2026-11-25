import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { isRecord, type ApiSuccessResponse } from '../types/api.types';

/**
 * Standardizes successful JSON payloads and attaches an X-Response-Time header.
 */
@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        response.setHeader('X-Response-Time', `${Date.now() - startedAt}ms`);
      }),
      map((payload) => {
        if (
          isRecord(payload) &&
          payload.success === true &&
          'data' in payload &&
          'timestamp' in payload
        ) {
          return payload as unknown as ApiSuccessResponse<T>;
        }
        return {
          success: true,
          data: payload,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
