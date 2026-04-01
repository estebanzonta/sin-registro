# tshirt-customizer - Setup backend

## Estado actual

### Implementado
- [x] Docker Compose con PostgreSQL
- [x] Migracion de SQLite a PostgreSQL
- [x] Backend organizado en `routes/`, `controllers/` y `services/`
- [x] Prisma migrations versionadas
- [x] Autenticacion JWT
- [x] Endpoints de catalogo, configurador, carrito, ordenes y admin
- [x] Dockerfile multi-stage para el backend

## Quick start

### 1. Variables de entorno
El backend usa `server/.env` y la raiz incluye `.env.local` y `.env.example` como referencia.

### 2. Levantar PostgreSQL
```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432` con:
- usuario: `customizer`
- password: `customizer123`
- database: `tshirt_customizer`

### 3. Instalar dependencias
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 4. Prisma
```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

Si estas desarrollando cambios de schema localmente:
```bash
npx prisma migrate dev --name <migration_name>
```

### 5. Ejecutar en desarrollo
```bash
npm run dev
```

Servicios esperados:
- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- health: `http://localhost:3001/health`

### 6. Smoke test backend
```bash
npm run smoke:server
```

Este script asegura seed minimo, asegura el admin de prueba, valida `health`, `auth`, `orders` y `admin`, y cierra el servidor al terminar.

## Datos de prueba

Para sembrar catalogo base:
```bash
cd server
node dist/seed.js
```

Para crear el admin de prueba:
```bash
cd server
node dist/create-admin.js
```

Credenciales de admin de prueba:
- email: `admin@example.com`
- password: `admin123456`

## Endpoints utiles

### Publicos
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/catalog/init
curl http://localhost:3001/api/catalog/designs
```

### Auth
```bash
curl -X POST http://localhost:3001/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"password\":\"secret123\"}"
```

### Admin
Los endpoints `/api/admin/*` requieren un JWT valido de un usuario con rol `admin`.

## Verificacion sugerida

- [ ] `docker compose up -d`
- [ ] `cd server && npx prisma migrate deploy`
- [ ] `cd server && npm run build`
- [ ] `cd server && node dist/seed.js`
- [ ] `cd server && node dist/create-admin.js`
- [ ] `npm run dev`
- [ ] `GET /health` responde `200`
- [ ] `POST /api/auth/login` con `admin@example.com` responde `200`
- [ ] `GET /api/admin/garment-models` con Bearer token admin responde `200`
