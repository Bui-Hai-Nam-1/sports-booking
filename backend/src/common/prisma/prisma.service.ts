import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch {
      // Allow running in offline or test mode without crashing on boot
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
