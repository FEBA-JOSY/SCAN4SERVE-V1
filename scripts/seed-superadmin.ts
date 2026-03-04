import { prisma } from "../lib/prisma";
import bcrypt from 'bcryptjs'



async function main() {
    const superadminEmail = 'superadmin@gmail.com'
    const password = 'superadmin123'
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log('Seeding superadmin...')

    const superadmin = await prisma.user.upsert({
        where: { email: superadminEmail },
        update: {
            password: hashedPassword,
        },
        create: {
            email: superadminEmail,
            name: 'Super Admin',
            password: hashedPassword,
            role: 'superadmin',
            isActive: true,
        },
    })

    console.log('Superadmin created/updated:', superadmin.email)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
