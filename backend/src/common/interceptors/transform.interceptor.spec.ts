import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap raw data in success: true and data', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ getHeader: () => null }),
      }),
    } as any;

    const callHandler = {
      handle: () => of({ message: 'Hello' }),
    };

    interceptor.intercept(context, callHandler).subscribe((res: any) => {
      expect(res.success).toBe(true);
      expect(res.data.message).toBe('Hello');
      done();
    });
  });

  it('should lift paginated { items, total } into data and meta', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ getHeader: () => null }),
      }),
    } as any;

    const callHandler = {
      handle: () => of({ items: [1, 2, 3], total: 3, page: 1 }),
    };

    interceptor.intercept(context, callHandler).subscribe((res: any) => {
      expect(res.success).toBe(true);
      expect(res.data).toEqual([1, 2, 3]);
      expect(res.meta.total).toBe(3);
      expect(res.meta.page).toBe(1);
      done();
    });
  });
});
