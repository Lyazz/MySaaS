import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

const DEFAULT_PROVISIONING_TOKEN_TTL: SignOptions['expiresIn'] = '15m';

type ProvisioningMode = 'hybrid' | 'offlineOnly';

export type ProvisioningTokenPayload = {
  tenantId: string;
  workspaceId: string;
  mode: ProvisioningMode;
  issuedByUserId: string;
};

const getProvisioningTokenSecret = (): string => {
  const secret =
    process.env.PROVISIONING_TOKEN_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'PROVISIONING_TOKEN_SECRET or JWT_SECRET environment variable is required'
    );
  }
  return secret;
};

const getProvisioningTokenTtl = (): SignOptions['expiresIn'] => {
  const configured = process.env.PROVISIONING_TOKEN_TTL?.trim();
  if (configured) return configured as SignOptions['expiresIn'];
  return DEFAULT_PROVISIONING_TOKEN_TTL;
};

export const signProvisioningToken = (
  payload: ProvisioningTokenPayload
): string => {
  return jwt.sign(payload, getProvisioningTokenSecret(), {
    algorithm: 'HS256',
    audience: 'admin-app',
    subject: payload.workspaceId,
    expiresIn: getProvisioningTokenTtl(),
  });
};

export const verifyProvisioningToken = (
  token: string
): JwtPayload & ProvisioningTokenPayload => {
  const decoded = jwt.verify(token, getProvisioningTokenSecret(), {
    algorithms: ['HS256'],
    audience: 'admin-app',
  });

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid provisioning token payload');
  }

  const tenantId =
    typeof decoded.tenantId === 'string' ? decoded.tenantId.trim() : '';
  const workspaceId =
    typeof decoded.workspaceId === 'string' ? decoded.workspaceId.trim() : '';
  const mode =
    decoded.mode === 'offlineOnly'
      ? 'offlineOnly'
      : decoded.mode === 'hybrid'
        ? 'hybrid'
        : '';
  const issuedByUserId =
    typeof decoded.issuedByUserId === 'string'
      ? decoded.issuedByUserId.trim()
      : '';

  if (!tenantId || !workspaceId || !mode || !issuedByUserId) {
    throw new Error('Provisioning token payload is incomplete');
  }

  return {
    ...decoded,
    tenantId,
    workspaceId,
    mode,
    issuedByUserId,
  };
};
