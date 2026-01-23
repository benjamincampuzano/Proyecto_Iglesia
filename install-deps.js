// install-deps.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando la instalación de dependencias...');

function runCommand(command, cwd = process.cwd()) {
  console.log(`\n📌 Ejecutando: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', cwd, shell: true });
    return true;
  } catch (error) {
    console.error(`❌ Error al ejecutar: ${command}`);
    return false;
  }
}

// Función para actualizar las dependencias a su última versión
function updateDependencies(cwd = process.cwd()) {
  console.log('\n🔄 Actualizando dependencias a la última versión...');
  
  // Obtener la lista de dependencias desactualizadas
  try {
    console.log('\n🔍 Buscando actualizaciones disponibles...');
    execSync('npm outdated', { stdio: 'pipe', cwd });
    console.log('✅ Todas las dependencias están actualizadas');
  } catch (outdatedError) {
    // Si hay paquetes desactualizados, npm outdated devuelve código de salida 1
    if (outdatedError.status === 1) {
      console.log('📦 Actualizando paquetes a sus últimas versiones...');
      if (!runCommand('npx npm-check-updates -u', cwd)) {
        console.warn('⚠️  No se pudo actualizar las dependencias automáticamente');
        return false;
      }
      
      // Instalar las dependencias actualizadas
      if (!runCommand('npm install', cwd)) {
        return false;
      }
    } else {
      console.error('❌ Error al verificar dependencias desactualizadas');
      return false;
    }
  }
  return true;
}

// Instalar dependencias del root
console.log('\n🔧 Instalando dependencias principales...');
if (!runCommand('npm install')) {
  process.exit(1);
}

// Actualizar dependencias del root
if (!updateDependencies()) {
  console.warn('⚠️  Continuando con la instalación, pero algunas dependencias podrían no estar actualizadas');
}

// Instalar y actualizar dependencias del cliente
console.log('\n💻 Instalando dependencias del cliente...');
const clientPath = path.join(process.cwd(), 'client');
if (fs.existsSync(clientPath)) {
  if (!runCommand('npm install', clientPath)) {
    process.exit(1);
  }
  if (!updateDependencies(clientPath)) {
    console.warn('⚠️  Algunas dependencias del cliente podrían no estar actualizadas');
  }
}

// Instalar y actualizar dependencias del servidor
console.log('\n🖥️  Instalando dependencias del servidor...');
const serverPath = path.join(process.cwd(), 'server');
if (fs.existsSync(serverPath)) {
  if (!runCommand('npm install', serverPath)) {
    process.exit(1);
  }
  if (!updateDependencies(serverPath)) {
    console.warn('⚠️  Algunas dependencias del servidor podrían no estar actualizadas');
  }
}

// Ejecutar migraciones de Prisma
console.log('\n🔄 Ejecutando migraciones de la base de datos...');
if (!runCommand('npx prisma migrate dev', serverPath)) {
  console.warn('⚠️  No se pudieron ejecutar las migraciones. Verifica la configuración de la base de datos.');
}

console.log('\n✅ ¡Todas las dependencias se han instalado y actualizado correctamente!');
!runCommand('npm install -g npm-check-updates')
console.log('🎉 ¡El proyecto está listo para desarrollarse!');
console.log('\nPara iniciar el proyecto, ejecuta:');
console.log('  npm run start\n');
