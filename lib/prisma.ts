import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined in environment variables");
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
    const pool = new pg.Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    // In development, use a global variable so the client isn't 
    // re-instantiated during hot-reloads
    if (!(global as any).prisma) {
        const pool = new pg.Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });
        const adapter = new PrismaPg(pool);
        (global as any).prisma = new PrismaClient({ adapter });
    }
    prisma = (global as any).prisma;
}

export { prisma };