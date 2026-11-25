import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('Auth & Roles Guards', () => {
  let authGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    authGuard = new JwtAuthGuard();
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  // Scenario 12: Unauthorized or wrong role blocked
  it('Scenario 12a: should throw UnauthorizedException when no Authorization header', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    expect(() => authGuard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('Scenario 12b: should authenticate valid Bearer token', () => {
    const payload = { id: 'u1', email: 'test@sports.com', role: UserRole.CUSTOMER };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;

    expect(authGuard.canActivate(context)).toBe(true);
    expect(req.user.id).toBe('u1');
    expect(req.user.role).toBe(UserRole.CUSTOMER);
  });

  it('Scenario 12c: RolesGuard should throw ForbiddenException when role does not match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'u1', role: UserRole.CUSTOMER },
        }),
      }),
    } as any;

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('Scenario 12d: RolesGuard allows when role matches', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'admin1', role: UserRole.ADMIN },
        }),
      }),
    } as any;

    expect(rolesGuard.canActivate(context)).toBe(true);
  });
});
