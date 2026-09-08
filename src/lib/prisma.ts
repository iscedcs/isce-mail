import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = globalThis.WebSocket;

const globalForPrisma = globalThis as unknown as {
  prismaClient: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prismaClient) {
    return globalForPrisma.prismaClient;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please ensure DATABASE_URL is configured in your .env or Vercel project settings.",
    );
  }

  const adapter = new PrismaNeon({ connectionString });
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClient = client;
  }

  return client;
}

// Export a proxy so importing `prisma` at build time doesn't throw if DATABASE_URL is not yet loaded,
// but accesses at runtime dynamically resolve to the connected client.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() as any;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const prisma = db;
export default db;
