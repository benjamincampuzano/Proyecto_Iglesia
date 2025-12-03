const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminUser() {
    try {
        const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@iglesia.com' }
        });

        if (adminUser) {
            console.log('✅ Usuario administrador encontrado en la base de datos:');
            console.log('ID:', adminUser.id);
            console.log('Email:', adminUser.email);
            console.log('Nombre:', adminUser.fullName);
            console.log('Rol:', adminUser.role);
            console.log('Creado:', adminUser.createdAt);
        } else {
            console.log('❌ No se encontró el usuario administrador en la base de datos');
        }

        // List all users
        const allUsers = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true
            }
        });

        console.log('\n📋 Todos los usuarios en la base de datos:');
        allUsers.forEach(user => {
            console.log(`- ${user.fullName} (${user.email}) - ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminUser();
