-- Seed 5 predefined staff roles for every tenant (idempotent).

-- Create roles (skip if already exist per tenant).
INSERT INTO "TenantStaffRole" ("id", "tenantId", "name", "createdAt", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    t."id",
    v."name",
    NOW(),
    NOW()
FROM "Tenant" t
CROSS JOIN (
    VALUES
        ('Gestionnaire commandes'),
        ('Approvisionnement'),
        ('Gestionnaire catalogue'),
        ('Caisse'),
        ('Lecture seule')
) AS v("name")
ON CONFLICT ("tenantId", "name") DO NOTHING;

-- Helper: seed permissions for a specific role by name.
-- Gestionnaire commandes
INSERT INTO "TenantStaffRolePermission" ("id", "tenantId", "roleId", "resource", "action", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    r."tenantId",
    r."id",
    p."resource",
    p."action",
    NOW()
FROM "TenantStaffRole" r
CROSS JOIN (
    VALUES
        ('dashboard', 'read'),
        ('orders', 'read'),
        ('orders', 'update'),
        ('customers', 'read'),
        ('delivery', 'read'),
        ('delivery', 'update')
) AS p("resource", "action")
WHERE r."name" = 'Gestionnaire commandes'
ON CONFLICT ("tenantId", "roleId", "resource", "action") DO NOTHING;

-- Approvisionnement
INSERT INTO "TenantStaffRolePermission" ("id", "tenantId", "roleId", "resource", "action", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    r."tenantId",
    r."id",
    p."resource",
    p."action",
    NOW()
FROM "TenantStaffRole" r
CROSS JOIN (
    VALUES
        ('dashboard', 'read'),
        ('purchases', 'create'),
        ('purchases', 'read'),
        ('purchases', 'update'),
        ('purchases', 'delete'),
        ('suppliers', 'create'),
        ('suppliers', 'read'),
        ('suppliers', 'update'),
        ('suppliers', 'delete'),
        ('inventory', 'read'),
        ('inventory', 'update'),
        ('products', 'read'),
        ('categories', 'read')
) AS p("resource", "action")
WHERE r."name" = 'Approvisionnement'
ON CONFLICT ("tenantId", "roleId", "resource", "action") DO NOTHING;

-- Gestionnaire catalogue
INSERT INTO "TenantStaffRolePermission" ("id", "tenantId", "roleId", "resource", "action", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    r."tenantId",
    r."id",
    p."resource",
    p."action",
    NOW()
FROM "TenantStaffRole" r
CROSS JOIN (
    VALUES
        ('dashboard', 'read'),
        ('products', 'create'),
        ('products', 'read'),
        ('products', 'update'),
        ('products', 'delete'),
        ('categories', 'create'),
        ('categories', 'read'),
        ('categories', 'update'),
        ('categories', 'delete'),
        ('variants', 'create'),
        ('variants', 'read'),
        ('variants', 'update'),
        ('variants', 'delete'),
        ('inventory', 'read'),
        ('inventory', 'update'),
        ('metaPixels', 'read'),
        ('metaPixels', 'update')
) AS p("resource", "action")
WHERE r."name" = 'Gestionnaire catalogue'
ON CONFLICT ("tenantId", "roleId", "resource", "action") DO NOTHING;

-- Caisse
INSERT INTO "TenantStaffRolePermission" ("id", "tenantId", "roleId", "resource", "action", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    r."tenantId",
    r."id",
    p."resource",
    p."action",
    NOW()
FROM "TenantStaffRole" r
CROSS JOIN (
    VALUES
        ('dashboard', 'read'),
        ('cash', 'create'),
        ('cash', 'read'),
        ('cash', 'update'),
        ('billing', 'read'),
        ('orders', 'read'),
        ('orders', 'update'),
        ('customers', 'read')
) AS p("resource", "action")
WHERE r."name" = 'Caisse'
ON CONFLICT ("tenantId", "roleId", "resource", "action") DO NOTHING;

-- Lecture seule
INSERT INTO "TenantStaffRolePermission" ("id", "tenantId", "roleId", "resource", "action", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    r."tenantId",
    r."id",
    p."resource",
    p."action",
    NOW()
FROM "TenantStaffRole" r
CROSS JOIN (
    VALUES
        ('dashboard', 'read'),
        ('products', 'read'),
        ('categories', 'read'),
        ('variants', 'read'),
        ('inventory', 'read'),
        ('orders', 'read'),
        ('sales', 'read'),
        ('purchases', 'read'),
        ('suppliers', 'read'),
        ('customers', 'read'),
        ('delivery', 'read'),
        ('cash', 'read'),
        ('billing', 'read'),
        ('storeSettings', 'read'),
        ('homepageSettings', 'read'),
        ('contactInfos', 'read'),
        ('integrations', 'read'),
        ('metaPixels', 'read'),
        ('pos', 'read')
) AS p("resource", "action")
WHERE r."name" = 'Lecture seule'
ON CONFLICT ("tenantId", "roleId", "resource", "action") DO NOTHING;

