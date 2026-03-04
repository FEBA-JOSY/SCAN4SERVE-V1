import { config } from "dotenv";
// Force reload after schema update
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// Load .env.local explicitly
config({ path: path.resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined in .env.local");
} else {
    // Log the host part to verify the env is loaded correctly
    console.log(`🔌 Database Host: ${connectionString.split('@')[1]?.split('/')[0]}`);
}

const pool = new pg.Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };