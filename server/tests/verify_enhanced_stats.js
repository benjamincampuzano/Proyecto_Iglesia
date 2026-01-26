const { PrismaClient } = require('@prisma/client');
const consolidarStatsController = require('../controllers/consolidarStatsController');

const prisma = new PrismaClient();

const mockRequest = (query = {}, user = { role: 'ADMIN', id: 1 }) => ({
    query,
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

async function verifyEnhancedStats() {
    console.log('=== VERIFICACIÓN DE INFORME GENERAL MEJORADO ===\n');

    try {
        const req = mockRequest({ startDate: '2020-01-01' });
        const res = mockResponse();

        await consolidarStatsController.getGeneralStats(req, res);

        if (res.statusCode === 200) {
            const data = res.data;
            console.log('✅ getGeneralStats respondió exitosamente');

            // Check for new fields
            if (data.summary && data.summary.totalGuests !== undefined) {
                console.log(`✅ Summary incluye totalGuests: ${data.summary.totalGuests}`);
            } else {
                console.log('❌ Summary NO incluye totalGuests');
            }

            if (data.summary && data.summary.totalConversions !== undefined) {
                console.log(`✅ Summary incluye totalConversions: ${data.summary.totalConversions}`);
            } else {
                console.log('❌ Summary NO incluye totalConversions');
            }

            if (data.summary && data.summary.conversionRate !== undefined) {
                console.log(`✅ Summary incluye conversionRate: ${data.summary.conversionRate}%`);
            } else {
                console.log('❌ Summary NO incluye conversionRate');
            }

            if (data.trackingStats) {
                console.log('✅ trackingStats incluido en la respuesta:');
                console.log(`   - Con Llamada: ${data.trackingStats.withCall}`);
                console.log(`   - Sin Llamada: ${data.trackingStats.withoutCall}`);
                console.log(`   - Con Visita: ${data.trackingStats.withVisit}`);
                console.log(`   - Sin Visita: ${data.trackingStats.withoutVisit}`);
            } else {
                console.log('❌ trackingStats NO incluido en la respuesta');
            }

        } else {
            console.log(`❌ Falló getGeneralStats: ${res.statusCode}`);
            console.log(res.data);
        }

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyEnhancedStats();
