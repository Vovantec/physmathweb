import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Исправление для Telegram ID (BigInt), чтобы JSON не ломался
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};