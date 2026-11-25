import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  const createContext = () =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ getHeader: () => null }),
      }),
    }) as any;

  it('wraps raw data in success: true and data', (done) => {
    const callHandler = { handle: () => of({ message: 'Hello' }) };

    interceptor.intercept(createContext(), callHandler).subscribe((res: any) => {
      expect(res.success).toBe(true);
      expect(res.data.message).toBe('Hello');
      done();
    });
  });

  it('preserves pagination fields inside data for frontend clients', (done) => {
    const payload = { items: [1, 2, 3], total: 3, page: 1, pageSize: 10, totalPages: 1 };
    const callHandler = { handle: () => of(payload) };

    interceptor.intercept(createContext(), callHandler).subscribe((res: any) => {
      expect(res.success).toBe(true);
      expect(res.data).toEqual(payload);
      expect(res.data.items).toEqual([1, 2, 3]);
      expect(res.data.total).toBe(3);
      expect(res.data.page).toBe(1);
      done();
    });
  });

  it('does not wrap an already standardized response', (done) => {
    const payload = { success: true, data: { id: '1' } };
    const callHandler = { handle: () => of(payload) };

    interceptor.intercept(createContext(), callHandler).subscribe((res: any) => {
      expect(res).toEqual(payload);
      done();
    });
  });
});
