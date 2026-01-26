const { PrismaClient } = require('@prisma/client');
const networkController = require('../controllers/networkController');

const prisma = new PrismaClient();

const mockRequest = (params = {}, user = { role: 'ADMIN', id: 1 }) => ({
    params,
    user
});

const mockResponse = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function verifyNetworkParents() {
    console.log('=== VERIFICACIÓN DE INFORMACIÓN DE LÍDERES EN LA RED ===\n');

    try {
        // Encontrar un usuario que tenga líder (LIDER_CELULA o DISCIPULO)
        const testUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { liderDoceId: { not: null } },
                    { pastorId: { not: null } },
                    { liderCelulaId: { not: null } }
                ]
            },
            include: {
                pastor: true,
                liderDoce: true,
                liderCelula: true
            }
        });

        if (!testUser) {
            console.log('⚠️ No se encontró un usuario con líderes para probar. Saltando verificación profunda.');
        } else {
            console.log(`Probando con usuario: ${testUser.fullName} (ID: ${testUser.id}, Rol: ${testUser.role})`);

            const req = mockRequest({ userId: testUser.id.toString() });
            const res = mockResponse();

            await networkController.getNetwork(req, res);

            if (res.statusCode === 200) {
                const network = res.data;
                console.log('✅ getNetwork respondió exitosamente');

                let foundExpected = false;
                if (testUser.pastorId && network.pastor) {
                    console.log(`✅ Pastor encontrado en la red: ${network.pastor.fullName}`);
                    foundExpected = true;
                }
                if (testUser.liderDoceId && network.liderDoce) {
                    console.log(`✅ Lider Doce encontrado en la red: ${network.liderDoce.fullName}`);
                    foundExpected = true;
                }
                if (testUser.liderCelulaId && network.liderCelula) {
                    console.log(`✅ Lider Celula encontrado en la red: ${network.liderCelula.fullName}`);
                    foundExpected = true;
                }

                if (!foundExpected && (testUser.pastorId || testUser.liderDoceId || testUser.liderCelulaId)) {
                    console.log('❌ El usuario tiene líderes pero no se devolvieron en el objeto de red');
                }
            } else {
                console.log(`❌ Falló getNetwork: ${res.statusCode}`);
                console.log(res.data);
            }
        }

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyNetworkParents();
