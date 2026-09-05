-- Platform-wide operator configuration (super-admin only, not tenant-scoped).
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- Super-admin overrides for the plan quotas in shared/pricing/plans.ts.
CREATE TABLE "PlanOverride" (
    "planCode" TEXT NOT NULL,
    "aiScansPerMonth" INTEGER,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanOverride_pkey" PRIMARY KEY ("planCode")
);
