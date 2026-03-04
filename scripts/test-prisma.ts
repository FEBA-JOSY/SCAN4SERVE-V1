import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
    try {
        console.log("Checking Restaurant model fields...");
        // This will fail at runtime if subdomain is missing from the JS export
        const res = await prisma.restaurant.create({
            data: {
                name: "Test Restaurant " + Date.now(),
                subdomain: "test" + Date.now(),
                email: "test@example.com",
                plan: "basic",
                subscriptionStatus: "active",
                isActive: true
            }
        });
        console.log("Success! Created restaurant with subdomain:", res.subdomain);
        await prisma.restaurant.delete({ where: { id: res.id } });
    } catch (e: any) {
        console.error("Test failed:", e.message);
    } finally {
        await pool.end();
    }
}

test();
