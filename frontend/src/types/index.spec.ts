import { describe, it, expect } from 'vitest';
import { isApiError } from './index';

describe('Type Guard: isApiError', () => {
  // Scenario 23: Type guard doesn't falsely accept invalid structure
  it('Scenario 23a: should return true for valid ApiError objects', () => {
    const validError = {
      success: false,
      statusCode: 400,
      message: 'Dữ liệu không hợp lệ',
      error: 'Bad Request',
      fieldErrors: { rating: ['Rating phải từ 1 đến 5'] },
    };

    expect(isApiError(validError)).toBe(true);
  });

  it('Scenario 23b: should return false for null, undefined, primitives', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('error string')).toBe(false);
    expect(isApiError(123)).toBe(false);
  });

  it('Scenario 23c: should return false when success is true or missing', () => {
    expect(isApiError({ success: true, statusCode: 200, message: 'OK' })).toBe(false);
    expect(isApiError({ statusCode: 400, message: 'Error without success' })).toBe(false);
  });

  it('Scenario 23d: should return false when statusCode is invalid or message is empty', () => {
    expect(isApiError({ success: false, statusCode: 200, message: 'Error' })).toBe(false); // 200 is not 4xx/5xx
    expect(isApiError({ success: false, statusCode: 404, message: '' })).toBe(false); // empty message
    expect(isApiError({ success: false, statusCode: '404', message: 'Error' })).toBe(false); // string status
  });
});
