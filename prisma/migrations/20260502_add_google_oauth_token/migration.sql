-- CreateTable "GoogleOAuthToken"
CREATE TABLE "GoogleOAuthToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleOAuthToken_tenantId_userId_key" ON "GoogleOAuthToken"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "GoogleOAuthToken_tenantId_idx" ON "GoogleOAuthToken"("tenantId");
