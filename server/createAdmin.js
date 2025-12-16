const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
    try {
        const email = 'admin@iglesia.com';
        const password = 'admin123';
        const fullName = 'Administrador Principal';

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('❌ El usuario administrador ya existe');
            console.log('Detalles encontrados:', existingUser);
            console.log('Email:', email);
            console.log('Puedes usar este usuario para iniciar sesión');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const adminUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                role: 'SUPER_ADMIN'
            }
        });

        console.log('✅ Usuario administrador creado exitosamente!');
        console.log('');
        console.log('Credenciales:');
        console.log('Email:', email);
        console.log('Contraseña:', password);
        console.log('Rol:', adminUser.role);
        console.log('');
        console.log('Usa estas credenciales para iniciar sesión y probar los permisos de administrador.');

    } catch (error) {
        console.error('❌ Error al crear usuario administrador:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser();
