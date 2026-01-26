const bcrypt = require('bcryptjs');

const DEFAULT_PASSWORD = 'test123';

const ensureUser = async (prisma, { email, fullName, role }) => {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    return prisma.user.upsert({
        where: { email },
        update: {
            fullName,
            role
        },
        create: {
            email,
            password: hashedPassword,
            fullName,
            role
        }
    });
};

/**
 * Ensures minimal data exists for backend tests.
 * Idempotent: safe to call multiple times.
 */
const ensureTestSeed = async (prisma) => {
    const users = {};

    users.superAdmin = await ensureUser(prisma, {
        email: 'test_ADMIN@tests.local',
        fullName: 'Test Super Admin',
        role: 'ADMIN'
    });

    users.pastor = await ensureUser(prisma, {
        email: 'test_pastor@tests.local',
        fullName: 'Test Pastor',
        role: 'PASTOR'
    });

    users.liderDoce = await ensureUser(prisma, {
        email: 'test_lider_doce@tests.local',
        fullName: 'Test Líder Doce',
        role: 'LIDER_DOCE'
    });

    users.liderCelula = await ensureUser(prisma, {
        email: 'test_lider_celula@tests.local',
        fullName: 'Test Líder Célula',
        role: 'LIDER_CELULA'
    });

    users.discipulo = await ensureUser(prisma, {
        email: 'test_discipulo@tests.local',
        fullName: 'Test Discípulo',
        role: 'DISCIPULO'
    });

    users.profesor = await ensureUser(prisma, {
        email: 'test_profesor@tests.local',
        fullName: 'Test Profesor',
        role: 'PROFESOR'
    });

    users.auxiliar = await ensureUser(prisma, {
        email: 'test_auxiliar@tests.local',
        fullName: 'Test Auxiliar',
        role: 'AUXILIAR'
    });

    return users;
};

module.exports = {
    ensureTestSeed,
    DEFAULT_PASSWORD
};
