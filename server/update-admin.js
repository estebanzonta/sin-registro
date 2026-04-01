import { prisma } from './src/db.js';
async function updateAdminRole() {
    try {
        const admin = await prisma.user.update({
            where: { email: 'admin@example.com' },
            data: { role: 'admin' },
        });
        console.log('✅ Admin role updated:', admin);
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
updateAdminRole();
//# sourceMappingURL=update-admin.js.map