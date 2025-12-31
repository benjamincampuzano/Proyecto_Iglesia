# 🧪 Guía de Pruebas del Proyecto

Este documento describe cómo ejecutar y entender las pruebas de análisis del proyecto.

## 📁 Estructura de Pruebas

### Backend Tests (`/server/tests/`)
- `test-auth-backend.js` - Pruebas del módulo de autenticación
- `test-users-backend.js` - Pruebas del módulo de usuarios
- `test-guests-backend.js` - Pruebas del módulo de invitados
- `test-cells-backend.js` - Pruebas del módulo de células
- `test-network-backend.js` - Pruebas del módulo de red jerárquica
- `test-seminars-backend.js` - Pruebas del módulo de seminarios
- `test-attendance-backend.js` - Pruebas del módulo de asistencia
- `test-encuentros-backend.js` - Pruebas del módulo de encuentros
- `test-conventions-backend.js` - Pruebas del módulo de convenciones
- `run-all-tests.js` - Script para ejecutar todas las pruebas del backend

### Frontend Tests (`/client/tests/`)
- `test-auth-frontend.js` - Pruebas de UI del módulo de autenticación
- `test-users-frontend.js` - Pruebas de UI del módulo de usuarios
- `test-guests-frontend.js` - Pruebas de UI del módulo de invitados
- `test-cells-frontend.js` - Pruebas de UI del módulo de células
- `test-network-frontend.js` - Pruebas de UI del módulo de red
- `run-all-tests.js` - Script para ejecutar todas las pruebas del frontend

## 🚀 Cómo Ejecutar las Pruebas

### Backend Tests

#### Ejecutar todas las pruebas del backend:
```bash
cd server/tests
node run-all-tests.js
# O si tienes problemas con ES modules:
node run-all-tests.cjs
```

#### Ejecutar una prueba específica:
```bash
cd server/tests
node test-auth-backend.js
node test-users-backend.js
# ... etc
```

### Frontend Tests

#### Ejecutar todas las pruebas del frontend:
```bash
cd client/tests
node run-all-tests.js
# O si tienes problemas con ES modules:
node run-all-tests.cjs
```

#### Ejecutar una prueba específica:
```bash
cd client/tests
node test-auth-frontend.js
node test-users-frontend.js
# ... etc
```

#### Usar Jest (si está instalado):
```bash
cd client/tests
npx jest test-auth-frontend.js
npx jest test-users-frontend.js
# ... etc
```

**Nota**: El proyecto está configurado como ES modules. Si encuentras errores con `require`, usa las versiones `.cjs` o los scripts `.js` ya están actualizados para usar `import`.

## 📋 Qué Prueban las Pruebas

### Backend Tests
Cada prueba de backend verifica:

1. **Funcionalidad CRUD**: Crear, leer, actualizar, eliminar
2. **Validaciones**: Campos requeridos, formatos, duplicados
3. **Seguridad**: Permisos por rol, autorización
4. **Lógica de Negocio**: Reglas específicas del módulo
5. **Manejo de Errores**: Respuesta a casos excepcionales
6. **Integridad de Datos**: Verificación en base de datos

### Frontend Tests
Cada prueba de frontend verifica:

1. **Interacción con API**: Llamadas a endpoints correctos
2. **Renderizado de UI**: Componentes se muestran correctamente
3. **Validaciones de Formularios**: Campos requeridos y formatos
4. **Estados de Carga**: Indicadores visuales durante operaciones
5. **Manejo de Errores**: Mensajes de error apropiados
6. **Experiencia de Usuario**: Flujos intuitivos y responsivos

## 🔧 Requisitos

### Para Backend:
- Node.js instalado
- Base de datos PostgreSQL corriendo
- Variables de entorno configuradas
- Dependencias del proyecto instaladas (`npm install`)

### Para Frontend:
- Node.js instalado
- Jest (opcional, para mejores reportes)
- Navegador para pruebas de UI (si se ejecutan en navegador)

## 📊 Reportes

Después de ejecutar las pruebas, se generará un archivo `test-report.json` en el directorio de pruebas con:

- Timestamp de ejecución
- Resumen (total, pasadas, fallidas, tasa de éxito)
- Resultados detallados por archivo
- Errores específicos si los hay

## 🐛 Solución de Problemas Comunes

### Problemas de Backend:
1. **Conexión a BD**: Verificar que PostgreSQL esté corriendo
2. **Variables de entorno**: Revisar archivo `.env`
3. **Permisos**: Asegurar que el usuario tenga permisos en la BD
4. **Dependencias**: Ejecutar `npm install` en `/server`

### Problemas de Frontend:
1. **Jest no encontrado**: Instalar con `npm install -g jest`
2. **Módulos no encontrados**: Ajustar rutas de importación
3. **Fetch no definido**: Asegurar que el mock esté configurado
4. **Dependencias**: Ejecutar `npm install` en `/client`

## 📝 Notas Importantes

1. **Datos de Prueba**: Las pruebas crean y limpian datos automáticamente
2. **Aislamiento**: Cada prueba es independiente de las demás
3. **Mocks**: Se utilizan mocks para no depender de datos reales
4. **Limpieza**: Los datos de prueba se eliminan después de cada prueba
5. **Cobertura**: Las pruebas cubren casos normales, edge cases y errores

## 🎯 Objetivo de las Pruebas

Estas pruebas están diseñadas para:

- ✅ Encontrar fallas de lógica en el código
- ✅ Verificar el funcionamiento correcto de cada módulo
- ✅ Asegurar la seguridad y validaciones
- ✅ Proveer retroalimentación rápida sobre problemas
- ✅ Facilitar el mantenimiento y evolución del proyecto

## 🔄 Actualización de Pruebas

Cuando se agreguen nuevas funcionalidades:

1. Crear nuevas pruebas para las nuevas funciones
2. Actualizar pruebas existentes si cambian los requerimientos
3. Ejecutar todas las pruebas para verificar compatibilidad
4. Actualizar este README con nueva información

---

**Nota**: Estas pruebas son una herramienta para encontrar fallas y mejorar la calidad del código. Deben ejecutarse regularmente durante el desarrollo.
