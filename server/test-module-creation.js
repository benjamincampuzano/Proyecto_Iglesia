// Test script to create a module directly
const fetch = require('node-fetch');

async function testCreateModule() {
    try {
        // First, login to get a token
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com', // Change to your admin email
                password: 'admin123' // Change to your admin password
            })
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);

        if (!loginData.token) {
            console.error('No token received');
            return;
        }

        // Now try to create a module
        const createResponse = await fetch('http://localhost:5000/api/consolidar/seminar/modules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            },
            body: JSON.stringify({
                name: 'Módulo de Prueba',
                description: 'Descripción de prueba',
                moduleNumber: 1
            })
        });

        const createData = await createResponse.json();
        console.log('Create module response status:', createResponse.status);
        console.log('Create module response:', createData);

        // Get all modules
        const getResponse = await fetch('http://localhost:5000/api/consolidar/seminar/modules', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });

        const modules = await getResponse.json();
        console.log('All modules:', modules);

    } catch (error) {
        console.error('Error:', error);
    }
}

testCreateModule();
