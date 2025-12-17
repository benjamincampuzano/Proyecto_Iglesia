# Plataforma de Gestión Mision Carismática Internacional

Bienvenido al repositorio de la Plataforma de Gestión de la Misión Carismática Internacional. Esta aplicación está diseñada para facilitar la administración de miembros, células, discipulado y eventos (encuentros, convenciones) dentro de la organización de la MCI en Manizales.

## 📋 Descripción del Proyecto

Este sistema permite a los líderes y administradores gestionar de manera eficiente:
- **Usuarios y Roles**: Gestión de perfiles con roles jerárquicos (Super Admin, Líder de 12, Líder de Célula, Miembro).
- **Discipulado**: Visualización y gestión de la estructura del liderazgo de la iglesoa.
- **Invitados**: Registro y seguimiento de nuevos invitados, desde su primer contacto hasta su conversión a miembros (proceso de "Ganar").
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
- Node.js (v14 o superior)
- NPM o Yarn
- Base de datos configurada (ver `.env` en `server/`)

### Configuración del Servidor (Backend)
1. Navega a la carpeta `server`:
   ```bash
   cd server
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno (`.env`) y ejecuta las migraciones de Prisma:
   ```bash
   npx prisma migrate dev
   ```
4. Inicia el servidor:
   ```bash
   npm run dev
   ```
   El servidor correrá en `http://localhost:5000`.

### Configuración del Cliente (Frontend)
1. Navega a la carpeta `client`:
   ```bash
   cd client
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

## 📸 Capturas de Pantalla


## 📸 Capturas de Pantalla

| Inicio de Sesión | Dashboard |
|------------------|-----------|
| ![Login Screen](C:/Users/Usuario/.gemini/antigravity/brain/a1b7b889-e777-450c-8b5f-35318ef31a91/login_screen_mockup_1765927340454.png) | ![Dashboard (Real)](C:/Users/Usuario/.gemini/antigravity/brain/a1b7b889-e777-450c-8b5f-35318ef31a91/real_dashboard_screenshot_1765927979485.png) |

| Matriz de Clases | Reporte Financiero |
|------------------|--------------------|
| ![Class Matrix](C:/Users/Usuario/.gemini/antigravity/brain/a1b7b889-e777-450c-8b5f-35318ef31a91/class_matrix_mockup_1765927365902.png) | ![Financial Report](C:/Users/Usuario/.gemini/antigravity/brain/a1b7b889-e777-450c-8b5f-35318ef31a91/financial_report_mockup_1765927398618.png) |

## 🎥 Demostración

> *Video demostrativo pendiente de carga.*

---
Desarrollado con ❤️ para el crecimiento de la iglesia.
