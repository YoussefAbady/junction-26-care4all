import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const shared = globalThis as typeof globalThis & { careDatabase?: PrismaClient };
export function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Database configuration unavailable");
  return shared.careDatabase ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 3000, query_timeout: 5000 }),
  });
}
