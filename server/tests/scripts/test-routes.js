const express = require('express');
const app = express();

// Test if seminarRoutes can be loaded
try {
    const seminarRoutes = require('./routes/seminarRoutes');
    console.log('✓ seminarRoutes loaded successfully');
    console.log('  Routes:', seminarRoutes.stack ? seminarRoutes.stack.map(r => r.route?.path) : 'unknown');

    app.use('/api/seminar', seminarRoutes);
    console.log('✓ Routes mounted at /api/seminar');

    const server = app.listen(5001, () => {
        console.log('✓ Test server running on port 5001');
        console.log('\nTesting routes:');

        const http = require('http');
        http.get('http://localhost:5001/api/seminar', (res) => {
            console.log(`  GET /api/seminar: ${res.statusCode}`);
            server.close();
        }).on('error', (err) => {
            console.log(`  Error: ${err.message}`);
            server.close();
        });
    });
} catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
}
