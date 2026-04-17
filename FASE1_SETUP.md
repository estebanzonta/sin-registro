# tshirt-customizer - Setup local

## Arquitectura actual

- Frontend Vite en `client/`
- API Express reutilizada por desarrollo local y Vercel Functions
- Prisma en `server/prisma`
- Deploy serverless en Vercel con entrypoints bajo `api/`

## Quick start

### 1. Variables de entorno

Usa `.env.local` en la raiz como referencia principal. `server/.env` puede seguir existiendo para tareas locales aisladas, pero el setup actual se apoya en las variables de la raiz.

### 2. Levantar PostgreSQL local

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
```

### 4. Prisma

```bash
npm run prisma:generate
npm run db:migrate:deploy
```

Si estas desarrollando cambios de schema localmente:

```bash
cd server
npx prisma migrate dev --name <migration_name>
```

### 5. Seed inicial

```bash
npm run db:seed
```

Eso prepara catalogo base y crea el admin inicial.

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Servicios esperados:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- health: `http://localhost:3001/health`

### 7. Smoke test backend

```bash
npm run smoke:server
```

Este script valida `health`, `auth`, `orders` y `admin`.

## Datos de prueba

Admin inicial:

- email: `admin@example.com`
- password: `admin123456`

Conviene cambiarlo despues de validar el entorno.

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
- [ ] `npm install`
- [ ] `npm run prisma:generate`
- [ ] `npm run db:migrate:deploy`
- [ ] `npm run db:seed`
- [ ] `npm run dev`
- [ ] `GET /health` responde `200`
- [ ] `POST /api/auth/login` con `admin@example.com` responde `200`
- [ ] `GET /api/admin/garment-models` con Bearer token admin responde `200`
