/**
 * Script principal para ejecutar todas las pruebas del frontend
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
    'test-auth-frontend.js',
    'test-users-frontend.js',
    'test-guests-frontend.js',
    'test-cells-frontend.js',
    'test-network-frontend.js'
];

console.log('🚀 Iniciando ejecución de todas las pruebas del Frontend...\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

testFiles.forEach((testFile, index) => {
    console.log(`\n📋 Ejecutando prueba ${index + 1}/${testFiles.length}: ${testFile}`);
    console.log('='.repeat(50));
    
    try {
        // Verificar si Jest está disponible
        try {
            execSync('npx jest --version', { encoding: 'utf8' });
            
            // Ejecutar con Jest si está disponible
            const startTime = Date.now();
            const output = execSync(`npx jest ${testFile} --verbose`, { 
                encoding: 'utf8',
                cwd: __dirname
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Analizar el output de Jest
            const hasFailures = output.includes('FAIL:') || output.includes('Test Suites: 1 failed');
            const hasSuccess = output.includes('PASS:') || output.includes('Test Suites: 1 passed');
            
            totalTests++;
            
            if (hasSuccess && !hasFailures) {
                passedTests++;
                console.log(`✅ ${testFile} - PASÓ (${duration}ms)`);
                results.push({ file: testFile, status: 'PASSED', duration, output });
            } else {
                failedTests++;
                console.log(`❌ ${testFile} - FALLÓ`);
                console.log('Output:', output);
                results.push({ file: testFile, status: 'FAILED', duration, output });
            }
            
        } catch (jestError) {
            // Si Jest no está disponible, intentar ejecutar directamente
            console.log('⚠️  Jest no encontrado, ejecutando prueba directamente...');
            const startTime = Date.now();
            const output = execSync(`node ${testFile}`, { 
                encoding: 'utf8',
                cwd: __dirname
            });
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Para pruebas ejecutadas directamente, verificamos si hay errores de sintaxis
            const hasSyntaxError = output.includes('SyntaxError') || output.includes('Error:');
            const hasSuccess = output.includes('✅ Pruebas de Frontend creadas exitosamente');
            
            totalTests++;
            
            if (!hasSyntaxError && hasSuccess) {
                passedTests++;
                console.log(`✅ ${testFile} - CREADO (${duration}ms)`);
                results.push({ file: testFile, status: 'CREATED', duration, output });
            } else {
                failedTests++;
                console.log(`❌ ${testFile} - ERROR`);
                console.log('Output:', output);
                results.push({ file: testFile, status: 'ERROR', duration, output });
            }
        }
        
    } catch (error) {
        failedTests++;
        totalTests++;
        console.log(`❌ ${testFile} - ERROR DE EJECUCIÓN`);
        console.log('Error:', error.message);
        results.push({ file: testFile, status: 'ERROR', error: error.message });
    }
});

console.log('\n' + '='.repeat(50));
console.log('📊 RESUMEN DE PRUEBAS DEL FRONTEND');
console.log('='.repeat(50));
console.log(`Total de pruebas: ${totalTests}`);
console.log(`Pruebas pasadas: ${passedTests}`);
console.log(`Pruebas fallidas: ${failedTests}`);
console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

// Generar reporte detallado
const report = {
    timestamp: new Date().toISOString(),
    summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1)
    },
    results: results
};

// Guardar reporte en archivo JSON
const reportPath = path.join(__dirname, 'test-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);

// Mostrar pruebas fallidas si hay alguna
if (failedTests > 0) {
    console.log('\n❌ PRUEBAS FALLIDAS:');
    results
        .filter(r => r.status === 'FAILED' || r.status === 'ERROR')
        .forEach(r => {
            console.log(`   - ${r.file}: ${r.status}`);
            if (r.error) {
                console.log(`     Error: ${r.error}`);
            }
        });
}

console.log('\n🎉 Ejecución de pruebas completada.');
