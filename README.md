# Plataforma de Gestión Mision Carismática Internacional

Bienvenido al repositorio de la Plataforma de Gestión de la Misión Carismática Internacional. Esta aplicación está diseñada para facilitar la administración de Miembros, células, discipulado y eventos (encuentros, convenciones) dentro de la organización de la MCI en Manizales.

## 📋 Descripción del Proyecto

Este sistema permite a los líderes y administradores gestionar de manera eficiente:
- **Usuarios y Roles**: Gestión de perfiles con roles jerárquicos (Super Admin, Líder de 12, Líder de Célula, Miembro).
- **Discipulado**: Visualización y gestión de la estructura del liderazgo de la iglesoa.
- **Invitados**: Registro y seguimiento de nuevos invitados, desde su primer contacto hasta su conversión a Miembros (proceso de "Ganar").
- **Eventos**: Administración de Encuentros y Convenciones.
- **Reportes**: Visualización de estadísticas de crecimiento y asistencia.

## 🚀 Estructura del Proyecto

El proyecto está dividido en dos partes principales: Servidor (Backend) y Cliente (Frontend).

```
Proyecto_Iglesia/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Componentes reutilizables (Listas, Tablas, Gráficos)
│   │   ├── context/        # Contextos de React (Auth, Theme)
│   │   ├── pages/          # Páginas principales (Login, Dashboard, Ganar, etc.)
│   │   └── ...
│   └── ...
├── server/                 # Backend (Node.js + Express)
│   ├── controllers/        # Lógica de negocio (Usuarios, Invitados, Eventos)
│   ├── middleware/         # Middlewares de autenticación y permisos
│   ├── prisma/             # Esquema de base de datos y migraciones
│   ├── routes/             # Definición de rutas API
│   └── index.js            # Punto de entrada del servidor
└── README.md               # Documentación del proyecto
```

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React, Vite, Tailwind CSS, Lucide React (Iconos), Recharts (Gráficos), React Router.
- **Backend**: Node.js, Express.js.
- **Base de Datos**: PostgreSQL (o compatible), gestionado con Prisma ORM.
- **Autenticación**: JWT (Json Web Tokens) con bcrypt para hasheo de contraseñas.

## ⚙️ Instalación y Uso

### Prerrequisitos
- Node.js (v16 o superior)
- NPM (v7 o superior) o Yarn
- PostgreSQL (o base de datos compatible)
- Git (opcional, para clonar el repositorio)

### 🚀 Instalación Rápida (Recomendada)

1. Clona el repositorio (si aún no lo has hecho):
   ```bash
   git clone https://github.com/tu-usuario/Proyecto_Iglesia.git
   cd Proyecto_Iglesia
   ```

2. Ejecuta el script de instalación:
   ```bash
   node install-deps.js
   ```
   Este comando instalará automáticamente todas las dependencias necesarias tanto para el frontend como para el backend.

3. Configura las variables de entorno:
   - Copia el archivo `.env.example` a `.env` en la carpeta `server/`
   - Ajusta las configuraciones según tu entorno

4. Inicia la aplicación:
   ```bash
   # En la raíz del proyecto
   npm run start
   ```
   Esto iniciará tanto el servidor como el cliente en modo desarrollo.

### 🔧 Instalación Manual

Si prefieres instalar las dependencias manualmente:

#### Configuración del Backend
```bash
cd server
npm install
cp .env.example .env
# Edita el archivo .env con tus credenciales
npx prisma migrate dev
npm run dev
```

#### Configuración del Frontend
```bash
cd client
npm install
npm run dev
```

### 🔌 Puertos por defecto
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📸 Capturas de Pantalla


## 🎥 Demostración



---
Desarrollado con ❤️ para el crecimiento de la iglesia.
