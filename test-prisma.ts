
import { prisma } from './lib/prisma';

async function check() {
  try {
    const user = await prisma.user.findFirst();
    console.log('User found:', user);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

check();
