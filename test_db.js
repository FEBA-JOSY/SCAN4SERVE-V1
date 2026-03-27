const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Testing Database Connection ---');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection Successful:', result);
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
