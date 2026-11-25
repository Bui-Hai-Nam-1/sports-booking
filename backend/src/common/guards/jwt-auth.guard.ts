import { Injectable } from '@nestjs/common';
import { JwtAuthGuard as PassportJwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
@Injectable()
export class JwtAuthGuard extends PassportJwtAuthGuard {}
