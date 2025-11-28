import { PrismaClient } from '@prisma/client';

let prismaInstance = null;

export function getPrismaInstance() {
  if (prismaInstance === null) {
    prismaInstance = new PrismaClient({
      log: ['error'],
      errorFormat: 'pretty'
    });
  }
  return prismaInstance;
}

export default getPrismaInstance;
