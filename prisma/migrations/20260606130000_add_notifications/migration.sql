CREATE TABLE IF NOT EXISTS "NotificationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "fcmToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationEvent_tenantId_id_key"
    ON "NotificationEvent"("tenantId", "id");
CREATE INDEX IF NOT EXISTS "NotificationEvent_tenantId_idx"
    ON "NotificationEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_tenantId_type_createdAt_idx"
    ON "NotificationEvent"("tenantId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationEvent_tenantId_entityType_entityId_idx"
    ON "NotificationEvent"("tenantId", "entityType", "entityId");

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSubscription_tenantId_id_key"
    ON "NotificationSubscription"("tenantId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSubscription_tenantId_userId_hardwareId_channel_key"
    ON "NotificationSubscription"("tenantId", "userId", "hardwareId", "channel");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_tenantId_idx"
    ON "NotificationSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_tenantId_userId_idx"
    ON "NotificationSubscription"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_tenantId_isActive_idx"
    ON "NotificationSubscription"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_tenantId_channel_idx"
    ON "NotificationSubscription"("tenantId", "channel");

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationDelivery_tenantId_eventId_userId_channel_subscriptionId_key"
    ON "NotificationDelivery"("tenantId", "eventId", "userId", "channel", "subscriptionId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_tenantId_idx"
    ON "NotificationDelivery"("tenantId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_tenantId_eventId_idx"
    ON "NotificationDelivery"("tenantId", "eventId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_tenantId_userId_readAt_idx"
    ON "NotificationDelivery"("tenantId", "userId", "readAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_tenantId_subscriptionId_idx"
    ON "NotificationDelivery"("tenantId", "subscriptionId");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_tenantId_status_idx"
    ON "NotificationDelivery"("tenantId", "status");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationEvent_tenantId_fkey') THEN
        ALTER TABLE "NotificationEvent"
            ADD CONSTRAINT "NotificationEvent_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationSubscription_tenantId_fkey') THEN
        ALTER TABLE "NotificationSubscription"
            ADD CONSTRAINT "NotificationSubscription_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationSubscription_tenantId_userId_fkey') THEN
        ALTER TABLE "NotificationSubscription"
            ADD CONSTRAINT "NotificationSubscription_tenantId_userId_fkey"
            FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationDelivery_tenantId_fkey') THEN
        ALTER TABLE "NotificationDelivery"
            ADD CONSTRAINT "NotificationDelivery_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationDelivery_tenantId_eventId_fkey') THEN
        ALTER TABLE "NotificationDelivery"
            ADD CONSTRAINT "NotificationDelivery_tenantId_eventId_fkey"
            FOREIGN KEY ("tenantId", "eventId") REFERENCES "NotificationEvent"("tenantId", "id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationDelivery_tenantId_userId_fkey') THEN
        ALTER TABLE "NotificationDelivery"
            ADD CONSTRAINT "NotificationDelivery_tenantId_userId_fkey"
            FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationDelivery_tenantId_subscriptionId_fkey') THEN
        ALTER TABLE "NotificationDelivery"
            ADD CONSTRAINT "NotificationDelivery_tenantId_subscriptionId_fkey"
            FOREIGN KEY ("tenantId", "subscriptionId") REFERENCES "NotificationSubscription"("tenantId", "id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;
