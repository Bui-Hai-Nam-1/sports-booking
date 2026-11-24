import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
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
        // If result is already structured with success flag or null/undefined, handle appropriately
        if (result && typeof result === 'object' && 'success' in result) {
          return result;
        }

        // Avoid transforming streams or direct file responses
        if (response.getHeader && response.getHeader('Content-Disposition')) {
          return result;
        }

        // If result has items and total, lift pagination to meta
        if (result && typeof result === 'object' && 'items' in result && 'total' in result) {
          const { items, ...meta } = result;
          return {
            success: true,
            data: items,
            meta,
          };
        }

        return {
          success: true,
          data: result,
        };
      }),
    );
  }
}
