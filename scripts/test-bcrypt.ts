import bcrypt from 'bcryptjs';

async function test() {
    const pwd = 'test';
    const hash = await bcrypt.hash(pwd, 10);
    console.log('Hash:', hash);
}

test();
