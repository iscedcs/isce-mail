import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = globalThis.WebSocket;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // During build time, DATABASE_URL might not be available
  // In this case, we return a lazy-loading client that will work at runtime
  if (!connectionString) {
    console.warn(
      "DATABASE_URL not available during build. The app will use database at runtime.",
    );

    // Create a lazy Prisma client that will work when DATABASE_URL is available
    const lazyDb = new Proxy(
      {},
      {
        get: () => {
          throw new Error(
            "DATABASE_URL environment variable is not set. " +
              "Make sure your .env file is loaded with DATABASE_URL.",
          );
        },
      },
    ) as any;

    return lazyDb;
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db = createPrismaClient();
export const prisma = db;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
