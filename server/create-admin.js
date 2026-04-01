import { prisma } from './src/db.js';
import bcryptjs from 'bcryptjs';
async function createAdminUser() {
    try {
        // Hash the password
        const hashedPassword = await bcryptjs.hash('admin123456', 10);
        // Create admin user
        const admin = await prisma.user.upsert({
            where: { email: 'admin@example.com' },
            update: {},
            create: {
                email: 'admin@example.com',
                password: hashedPassword,
                role: 'admin',
            },
        });
        console.log('✅ Admin user created or already exists:', admin);
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
createAdminUser();
//# sourceMappingURL=create-admin.js.map