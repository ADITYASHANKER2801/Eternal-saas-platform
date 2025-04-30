import { PrismaClient } from "@prisma/client";

const prismadb = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default prismadb;
