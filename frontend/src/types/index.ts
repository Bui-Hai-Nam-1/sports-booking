export type UserRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
