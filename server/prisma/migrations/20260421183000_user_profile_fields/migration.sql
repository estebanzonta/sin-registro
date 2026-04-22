ALTER TABLE "User"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "phone" TEXT;

UPDATE "User"
SET
  "firstName" = CASE WHEN "email" = 'admin@example.com' THEN 'Admin' ELSE 'Pendiente' END,
  "lastName" = CASE WHEN "email" = 'admin@example.com' THEN 'Sistema' ELSE 'Pendiente' END,
  "city" = CASE WHEN "email" = 'admin@example.com' THEN 'Admin' ELSE 'Pendiente' END,
  "province" = CASE WHEN "email" = 'admin@example.com' THEN 'Admin' ELSE 'Pendiente' END,
  "address" = CASE WHEN "email" = 'admin@example.com' THEN 'Panel administrativo' ELSE 'Pendiente' END,
  "phone" = CASE WHEN "email" = 'admin@example.com' THEN '0000000000' ELSE 'Pendiente' END
WHERE
  "firstName" IS NULL
  OR "lastName" IS NULL
  OR "city" IS NULL
  OR "province" IS NULL
  OR "address" IS NULL
  OR "phone" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "province" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;
