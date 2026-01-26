# Documentación del Proyecto - Sistema de Gestión de Iglesia

Este documento proporciona una visión general técnica y funcional del sistema de gestión de iglesia, detallando el stack tecnológico, la estructura de módulos y los componentes principales.

## Stack Tecnológico

### Frontend (Cliente)
*   **Lenguaje:** JavaScript (ES6+)
*   **Framework:** React v19.2.3
*   **Build Tool:** Vite v7.3.0
*   **Estilos:** TailwindCSS v4.1.18
*   **Routing:** React Router DOM v7.11.0
*   **Estado & Utilidades:** 
    *   `axios` (Peticiones HTTP)
    *   `date-fns` (Manejo de fechas)
    *   `lodash` (Utilidades varias)
    *   `xlsx` / `exceljs` (Exportación de datos)
*   **Visualización:**
    *   `recharts` (Gráficos y estadísticas)
    *   `leaflet` / `react-leaflet` (Mapas)
    *   `lucide-react` (Iconos)

### Backend (Servidor)
*   **Lenguaje:** JavaScript (Node.js - CommonJS)
*   **Framework:** Express v5.2.1
*   **ORM:** Prisma v6.6.0
*   **Base de Datos:** PostgreSQL (Inferido por Prisma)
*   **Seguridad:**
    *   `bcryptjs` (Hashing de contraseñas)
    *   `jsonwebtoken` (JWT para autenticación)
    *   `helmet` (Headers de seguridad HTTP)
    *   `cors` (Cross-Origin Resource Sharing)
*   **Herramientas:** `nodemon` (Hot reload en desarrollo)

---

## Módulos del Sistema

El sistema está dividido en módulos funcionales que mapean los procesos clave de la iglesia (Ganar, Consolidar, Discipular, Enviar) y funciones administrativas.

### 1. Autenticación y Seguridad
Gestión de acceso de usuarios y protección de rutas.
*   **Páginas:** `Login.jsx`, `Register.jsx`, `SetupWizard.jsx`
*   **Backend:** `authController.js`

### 2. Gestión de Usuarios y Red (Home)
Administración de perfiles y visualización de la red de discipulado (árbol jerárquico).
*   **Páginas:** `Home.jsx`, `UserManagement.jsx`
*   **Componentes Clave:** 
    *   `NetworkTree.jsx` (Visualización de jerarquía)
    *   `UserManagementModal.jsx` (CRUD de usuarios con roles)
    *   `UserProfileModal.jsx` (Perfil personal)
*   **Backend:** `userController.js`, `networkController.js`

### 3. Ganar (Evangelismo)
Registro y seguimiento inicial de invitados.
*   **Página:** `Ganar.jsx`
*   **Componentes Clave:**
    *   `GuestList.jsx` (Listado y filtros de invitados)
    *   `GuestRegistrationForm.jsx` (Formulario de captación)
    *   `GuestStats.jsx` (Estadísticas de nuevos invitados)
*   **Backend:** `guestController.js`, `guestStatsController.js`

### 4. Consolidar (Seguimiento)
Proceso de integración de invitados a la iglesia y seguimiento de asistencia.
*   **Página:** `Consolidar.jsx`
*   **Componentes Clave:**
    *   `GuestTracking.jsx` (Gestión de llamadas y visitas)
    *   `ChurchAttendance.jsx` (Asistencia dominical)
    *   `ConsolidatedStatsReport.jsx` (Reportes generales e indicadores KPI)
    *   `ChurchAttendanceChart.jsx` (Gráficos históricos)
*   **Backend:** 
    *   `guestTrackingController.js` (Llamadas/Visitas)
    *   `churchAttendanceController.js` (Asistencia cultos)
    *   `consolidarStatsController.js` (Métricas agregadas)

### 5. Discipular (Escuela y Capacitación)
Gestión académica, cursos, seminarios y calificaciones.
*   **Página:** `Discipular.jsx`
*   **Componentes Clave:**
    *   `CapacitacionDestino/` (Módulo de cursos)
    *   `School/` (Gestión de escuela de liderazgo)
    *   `SeminarModuleList.jsx` (Listado de módulos)
    *   `StudentProgress.jsx` (Kardex académico)
    *   `ClassAttendanceTracker.jsx` (Control de asistencia a clases)
*   **Backend:** `seminarController.js`, `schoolController.js`, `classAttendanceController.js`

### 6. Enviar (Células)
Gestión de grupos pequeños (células), ubicaciones y asistencia.
*   **Página:** `Enviar.jsx`
*   **Componentes Clave:**
    *   `CellManagement.jsx` (CRUD de células)
    *   `CellMap.jsx` (Geolocalización de células)
    *   `CellAttendance.jsx` (Reporte de asistencia celula)
*   **Backend:** 
    *   `cellController.js` (Gestión de células)
    *   `cellAttendanceController.js` (Asistencia)

### 7. Eventos (Encuentros y Convenciones)
Gestión de eventos masivos, registros y pagos.
*   **Páginas:** `Encuentros.jsx`, `Convenciones.jsx`
*   **Componentes Clave:**
    *   `EncuentroDetails.jsx` (Gestión detallada de encuentro)
    *   `ConventionDetails.jsx` (Gestión detallada de convención)
    *   `BalanceReport.jsx` (Reporte financiero de evento)
*   **Backend:** `encuentroController.js`, `conventionController.js`

### 8. Auditoría y Sistema
Monitorización de actividades y cambios en el sistema.
*   **Página:** `AuditDashboard.jsx`
*   **Componentes Clave:** Dashboard con gráficos de actividad y logs detallados (diffs).
*   **Backend:** `auditController.js`, `utils/auditLogger.js`

## Roles de Usuario
El sistema implementa un control de acceso basado en roles (RBAC):
*   `ADMIN`: Control total del sistema.
*   `PASTOR`: Gestión de su red completa.
*   `LIDER_DOCE`: Líder principal de red.
*   `LIDER_CELULA`: Líder de grupo pequeño.
*   `DISCIPULO` / `MIEMBRO`: Usuario base.

## Estructura de Directorios

### Client
```
client/src/
├── components/     # Componentes reutilizables y módulos específicos
├── pages/          # Vistas principales (Rutas)
├── utils/          # Funciones auxiliares y configuración de API
└── App.jsx         # Configuración de Rutas y Layout
```

### Server
```
server/
├── controllers/    # Lógica de negocio
├── routes/         # Definición de endpoints API
├── prisma/         # Esquema de base de datos y migraciones
├── utils/          # Helpers (Logger, etc.)
└── index.js        # Punto de entrada y configuración del servidor
```
