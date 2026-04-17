## Deploy Setup

Este proyecto ya tiene:
- frontend Vite listo para build
- backend expuesto para Vercel Functions en `api/[...route].ts` y wrappers por segmento en `api/*/[...route].ts`
- Prisma configurado para PostgreSQL
- soporte para Supabase Storage en produccion

Todavia tenes que crear recursos reales en tus cuentas de Supabase y Vercel.

## 1. Crear Supabase

1. Entra a Supabase y crea un proyecto nuevo.
2. Guarda estos valores:
   - `Project URL`
   - `Service Role Key`
   - `Database password`
   - `Project reference`
3. En Storage, crea un bucket publico llamado `assets`.

## 2. Armar DATABASE_URL

Formato esperado:

```env
DATABASE_URL=postgresql://postgres:<db_password>@db.<project-ref>.supabase.co:5432/postgres
```

## 3. Aplicar schema y seed

Con la base creada y `DATABASE_URL` configurada localmente:

```bash
npm run prisma:generate
npm run db:migrate:deploy
npm run db:seed
```

Eso crea:
- schema completo
- catalogo inicial
- usuario admin por defecto

Admin inicial:

```text
email: admin@example.com
password: admin123456
```

Conviene cambiarlo despues de validar el deploy.

## 4. Variables en Vercel

Carga estas variables en Vercel:

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRY=7d
CORS_ORIGIN=
VITE_API_URL=
STORAGE_DRIVER=supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=assets
IMGLY_API_KEY=
```

Notas:
- `VITE_API_URL` puede quedar vacio si frontend y backend viven en el mismo proyecto Vercel.
- `CORS_ORIGIN` debe incluir tu dominio final de Vercel y cualquier dominio personalizado.
- En produccion el backend ahora falla explicitamente si `CORS_ORIGIN` no esta definido.
- En produccion `STORAGE_DRIVER=local` ya no esta permitido; debe quedar en `supabase`.

## 5. Crear proyecto en Vercel

1. Importa este repo en Vercel.
2. Root Directory: deja el root del repo.
3. Framework preset: `Other`.
4. Vercel va a usar:
   - `vercel.json`
   - `client/dist` como output
   - `api/` como superficie de funciones

## 6. Primer deploy

Despues de cargar variables:

1. Hace el deploy inicial.
2. Proba:
   - `/`
   - `/admin/login`
   - flujo de catalogo
   - carga de assets en admin

## 7. Si falla

Revisa en este orden:

1. `DATABASE_URL` correcta.
2. `JWT_SECRET` cargado.
3. bucket `assets` creado en Supabase Storage.
4. `SUPABASE_SERVICE_ROLE_KEY` correcta.
5. schema aplicado con `npm run db:migrate:deploy`.
6. seed ejecutado con `npm run db:seed`.

## 8. Punto pendiente importante

Desde esta sesion no pude enlazar tu cuenta de Vercel ni crear el proyecto automaticamente porque no hay equipo/proyecto accesible por la integracion actual y no existe `.vercel/project.json` en el repo.

Eso significa que el repo quedo preparado, pero la creacion real de recursos en tus cuentas la tenes que hacer vos o despues de conectar la cuenta correcta.
