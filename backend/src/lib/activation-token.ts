import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

/**
 * Activation licenses are signed with an RS256 keypair so the Flutter app can
 * verify one offline, with no network call, against an embedded public key.
 *
 * There is deliberately no fallback key here. This file previously shipped a
 * working private key as a default for when `ACTIVATION_PRIVATE_KEY` was unset,
 * which meant anyone with repo access could mint a valid activation license for
 * any tenant. `assertRequiredEnv()` (see `./env-check`) now refuses to boot
 * without both halves of the pair.
 */

const normalizePem = (value: string) => value.replace(/\\n/g, '\n').trim();

const requirePem = (name: 'ACTIVATION_PRIVATE_KEY' | 'ACTIVATION_PUBLIC_KEY'): string => {
  const configured = process.env[name]?.trim();
  if (!configured) {
    throw new Error(
      `${name} environment variable is required to sign or verify activation licenses`
    );
  }
  return normalizePem(configured);
};

const getActivationPrivateKey = (): string => requirePem('ACTIVATION_PRIVATE_KEY');

export const getActivationPublicKey = (): string => requirePem('ACTIVATION_PUBLIC_KEY');

export const ACTIVATION_TOKEN_AUDIENCE = 'admin-app-device';

/**
 * How long a token stays *verifiable* after it stops being *valid*.
 *
 * `exp` is deliberately later than `graceUntil`. The app must still be able to
 * open an expired license to say "expired on 4 March, reactivate here" -- if
 * `exp` were the lock instant, an expired device would see an unparseable blob
 * and could only show a blank wall. The lock decision reads the explicit
 * `graceUntil` claim; `exp` is only the outer bound on readability.
 */
const POST_GRACE_READABILITY_DAYS = 30;
const DAY_SECONDS = 24 * 60 * 60;

/** Claims present on every activation token, v1 and v2 alike. */
export type ActivationTokenCore = {
  tenantId: string;
  /** Always equal to `deviceId`. Names the encrypted local database directory
   *  on the client, so it must stay stable for a given hardware id forever. */
  workspaceId: string;
  mode: 'hybrid' | 'offlineOnly';
  subscriptionTier: 'online' | 'offlineOnly';
  licenseKey: string;
  hardwareId: string;
  deviceId: string;
};

/** Claims added in v2: everything the device needs to police itself offline. */
export type ActivationTokenLicenseClaims = {
  v: 2;
  licenseId: string;
  /** `Device.tokenVersion` at mint time. A revoke or transfer bumps it, which
   *  retires this token on its next contact without needing a blocklist. */
  tokenVersion: number;
  maxDevices: number;
  planCode: string;
  subscriptionStatus: string;
  /** ISO, or null when the tenant is not on a trial. */
  trialEnd: string | null;
  /** ISO. After this the app warns; it does not lock yet. */
  licenseExpiresAt: string;
  /** ISO. After this the app drops to read-only. */
  graceUntil: string;
  /** ISO server clock at mint time. Seeds the client's monotonic high-water
   *  mark, so rolling the device clock back cannot un-expire a license. */
  issuedAt: string;
};

export type ActivationTokenPayloadV2 = ActivationTokenCore &
  ActivationTokenLicenseClaims;

/** Retained for the v1 tokens still in the field. */
export type ActivationTokenPayload = ActivationTokenCore;

export type VerifiedActivationToken = JwtPayload &
  ActivationTokenCore &
  Partial<ActivationTokenLicenseClaims> & {
    /** 1 for tokens minted before the license claims existed. */
    tokenSchemaVersion: 1 | 2;
    /** Which configured key verified the signature. */
    signingKeyUsed: 'current' | 'previous';
  };

const getPreviousActivationPublicKey = (): string | null => {
  const configured = process.env.ACTIVATION_PUBLIC_KEY_PREVIOUS?.trim();
  return configured ? normalizePem(configured) : null;
};

export const signActivationToken = (
  payload: ActivationTokenPayloadV2,
  options?: { expiresIn?: SignOptions['expiresIn'] }
): string => {
  const graceUntilMs = Date.parse(payload.graceUntil);
  if (Number.isNaN(graceUntilMs)) {
    throw new Error('signActivationToken requires an ISO `graceUntil`');
  }

  // Absolute `exp`, so it tracks the license window rather than the mint time.
  // jsonwebtoken rejects a payload `exp` combined with `expiresIn`, so the
  // override below is mutually exclusive with it -- it exists for tests that
  // need a deliberately stale token.
  const exp =
    Math.floor(graceUntilMs / 1000) + POST_GRACE_READABILITY_DAYS * DAY_SECONDS;

  const signOptions: SignOptions = {
    algorithm: 'RS256',
    audience: ACTIVATION_TOKEN_AUDIENCE,
    subject: payload.deviceId,
  };

  if (options?.expiresIn !== undefined) {
    signOptions.expiresIn = options.expiresIn;
    return jwt.sign(payload, getActivationPrivateKey(), signOptions);
  }

  return jwt.sign({ ...payload, exp }, getActivationPrivateKey(), signOptions);
};

/**
 * @param options.allowPreviousKey accept a signature from
 *   `ACTIVATION_PUBLIC_KEY_PREVIOUS`. Only the renewal paths (heartbeat, offline
 *   re-issue) may pass this, and they must still re-read the Device row and
 *   require status ACTIVE afterwards. A previous-key token is evidence of a past
 *   activation, never proof of a currently held seat.
 */
export const verifyActivationToken = (
  token: string,
  options?: { allowPreviousKey?: boolean }
): VerifiedActivationToken => {
  const verifyWith = (key: string) =>
    jwt.verify(token, key, {
      algorithms: ['RS256'],
      audience: ACTIVATION_TOKEN_AUDIENCE,
    });

  let decoded: ReturnType<typeof verifyWith>;
  let signingKeyUsed: 'current' | 'previous' = 'current';

  try {
    decoded = verifyWith(getActivationPublicKey());
  } catch (currentKeyError) {
    const previousKey = options?.allowPreviousKey
      ? getPreviousActivationPublicKey()
      : null;

    if (!previousKey) throw currentKeyError;

    decoded = verifyWith(previousKey);
    signingKeyUsed = 'previous';
  }

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid activation token payload');
  }

  const str = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

  const tenantId = str(decoded.tenantId);
  const workspaceId = str(decoded.workspaceId);
  const mode =
    decoded.mode === 'offlineOnly'
      ? 'offlineOnly'
      : decoded.mode === 'hybrid'
        ? 'hybrid'
        : '';
  const subscriptionTier =
    decoded.subscriptionTier === 'offlineOnly'
      ? 'offlineOnly'
      : decoded.subscriptionTier === 'online'
        ? 'online'
        : '';
  const licenseKey = str(decoded.licenseKey);
  const hardwareId = str(decoded.hardwareId);
  const deviceId = str(decoded.deviceId);

  if (
    !tenantId ||
    !workspaceId ||
    !mode ||
    !subscriptionTier ||
    !licenseKey ||
    !hardwareId ||
    !deviceId
  ) {
    throw new Error('Activation token payload is incomplete');
  }

  // A missing `v` claim means a token minted before the license window existed.
  // Those must keep verifying: the field is full of them, and refusing one would
  // brick a device that has done nothing wrong. The caller synthesizes a short
  // window for them instead.
  const tokenSchemaVersion: 1 | 2 = decoded.v === 2 ? 2 : 1;

  if (tokenSchemaVersion === 2) {
    const licenseId = str(decoded.licenseId);
    const licenseExpiresAt = str(decoded.licenseExpiresAt);
    const graceUntil = str(decoded.graceUntil);

    if (
      !licenseId ||
      !licenseExpiresAt ||
      !graceUntil ||
      typeof decoded.tokenVersion !== 'number'
    ) {
      throw new Error('Activation token v2 payload is incomplete');
    }
  }

  return {
    ...decoded,
    tenantId,
    workspaceId,
    mode,
    subscriptionTier,
    licenseKey,
    hardwareId,
    deviceId,
    tokenSchemaVersion,
    signingKeyUsed,
  };
};
