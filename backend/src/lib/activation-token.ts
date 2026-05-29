import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

const DEFAULT_DEV_ACTIVATION_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4OW4iDVgRs7zEKyg90Pf
grga0o2/1nSQ3eA95d57m4gBl/QGVYQtUEJat6VO1ndExXDED90npLbOYkz/GyRU
q1o03Xcj4B7BfBIbxyxQ+/mFsGTxGSyMWgcxsSyxh9tDEXF9eqzjHKldhjEAZ0fY
wTo/Cr4xJJOk2eo5m8yvkCqFBeRyTIKGxfTpAIEcaCCHoeQQZy5zXvCumr+cSOVe
geXV5M7kb9bM92Y/9wV3SNza4CHeEm8JoXOWoyWoUyI2cc1qG5ju/NUBG1+pqSEo
JwNDCWZCX2eZn/KRF4DeBUrhEkTXTtcbjNMrVXTTF7eM5spvTFbkqtf18QMa7TE6
ZwIDAQAB
-----END PUBLIC KEY-----`;

const DEFAULT_DEV_ACTIVATION_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDg5biINWBGzvMQ
rKD3Q9+CuBrSjb/WdJDd4D3l3nubiAGX9AZVhC1QQlq3pU7Wd0TFcMQP3Sekts5i
TP8bJFSrWjTddyPgHsF8EhvHLFD7+YWwZPEZLIxaBzGxLLGH20MRcX16rOMcqV2G
MQBnR9jBOj8KvjEkk6TZ6jmbzK+QKoUF5HJMgobF9OkAgRxoIIeh5BBnLnNe8K6a
v5xI5V6B5dXkzuRv1sz3Zj/3BXdI3NrgId4Sbwmhc5ajJahTIjZxzWobmO781QEb
X6mpISgnA0MJZkJfZ5mf8pEXgN4FSuESRNdO1xuM0ytVdNMXt4zmym9MVuSq1/Xx
AxrtMTpnAgMBAAECggEAEvGgXtWjXuBYmFNfDU6WtmiGCeDBNtiDlpnCKc/ynyIQ
g3/Qql9p5oedI9I1SkEQ3LjBxLxSQvOksTvfH6aQ/NlD+FIfn+W3UplYsakWYUM3
2akgp4gzG/PcyBnSeNxYhLc6/jX8Vqu4u9b6buvqyP8vbdsIQXzjHZM3RKjNmQ0N
BW2B4+Q/vPzxPrSUFmilx315cC5mmfGlMNzxHj5tj+AnVXcbQQH8Xn8JI/jxCrGm
VS0KzEv+hQJWiCtCuJAg+QSMrVO3oseQ7C6YCMa4NjK+9G/h1I/mCcPWUp+H7JL0
p/c+uilHZLpm1ym3ojXyogw+VjP0tNZJC0aOuI+m4QKBgQDwsD3yI/lQpTKZ9AVN
oWtDqW/jAP8183xIqxWhEzGjXag0/ilgfo2rMP7QqI2f1QdzWD3TSal/h4RB0W1A
aKXztJEJU59RsPvcliUJ68ppNUZws7DLsw+XcvAHUMzFRQxXove7Iok+B7LMXnK6
uzWm0VplsVuEY0XY/YI4b3aJTwKBgQDvNE+qXhTjCyePHblkWYeIVk+qjJuWcNdT
Nv+uKAPfk7eXGyOxKR4SFBRQNUY2Szcq7cZAxmqN0f9ql1rk8mwWr9jIMx3VdZWQ
Adj9EnuOxB4KhYvFTU8wMaJuBgTyVI+54U9vBglYk4e/hBsjEVPgL2v51hXSi0kg
dXXZFyJHaQKBgESqczHGk5UvXA1R8cVg/OITz8jaevTgXx+4N3Z5rFqoGJntvM47
rJ0fYEMVIzprIzIEBbdmt4Wbmt7QKbQLZvTtGceoZLaAoIohB7YZ3+g9+7ehfBnR
HuydLN9ZbOIGveuuobBwvOjGd3sYovClAjxyU7DZdXuCeuXaBTGmkxG/AoGAICBk
ers8DupWm9AgMCweGd+Nv5g25VOud8yxNlDFhGewhqjseETPdxofSE5/aZdch3V7
5QNBGF8V8Nj3Kjys67ceZHUJErxCJB87Z3HuClSovD0Hcq5Zbl2cNS61x144F3z9
UCn9Y1odJ0m041bWbwuvctSgBbETVzqvY0LKJdECgYBrwJTy1QNLb/fmtR1fXPnX
CqS2WJW9zWjyCGo0PT275z2ucRKZzlJFrGySEO62eM33QKo+aEXCMoeMbM0trjuY
b2JXpgAknrFbEruajcaWn0wsT66/pmGmIeT9XMZXTF10QQL+Fxz4WPFON1YeaAvg
z4cWRESn/2HfncDor1agZg==
-----END PRIVATE KEY-----`;

const normalizePem = (value: string) => value.replace(/\\n/g, '\n').trim();

const getActivationPrivateKey = (): string => {
  const configured = process.env.ACTIVATION_PRIVATE_KEY?.trim();
  if (configured) return normalizePem(configured);
  return DEFAULT_DEV_ACTIVATION_PRIVATE_KEY;
};

export const getActivationPublicKey = (): string => {
  const configured = process.env.ACTIVATION_PUBLIC_KEY?.trim();
  if (configured) return normalizePem(configured);
  return DEFAULT_DEV_ACTIVATION_PUBLIC_KEY;
};

export type ActivationTokenPayload = {
  tenantId: string;
  workspaceId: string;
  mode: 'hybrid' | 'offlineOnly';
  subscriptionTier: 'online' | 'offlineOnly';
  licenseKey: string;
  hardwareId: string;
  deviceId: string;
};

export const signActivationToken = (
  payload: ActivationTokenPayload,
  options?: { expiresIn?: SignOptions['expiresIn'] }
): string => {
  return jwt.sign(payload, getActivationPrivateKey(), {
    algorithm: 'RS256',
    audience: 'admin-app-device',
    subject: payload.deviceId,
    expiresIn: options?.expiresIn ?? '365d',
  });
};

export const verifyActivationToken = (
  token: string
): JwtPayload & ActivationTokenPayload => {
  const decoded = jwt.verify(token, getActivationPublicKey(), {
    algorithms: ['RS256'],
    audience: 'admin-app-device',
  });

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid activation token payload');
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
  const subscriptionTier =
    decoded.subscriptionTier === 'offlineOnly'
      ? 'offlineOnly'
      : decoded.subscriptionTier === 'online'
        ? 'online'
        : '';
  const licenseKey =
    typeof decoded.licenseKey === 'string' ? decoded.licenseKey.trim() : '';
  const hardwareId =
    typeof decoded.hardwareId === 'string' ? decoded.hardwareId.trim() : '';
  const deviceId =
    typeof decoded.deviceId === 'string' ? decoded.deviceId.trim() : '';

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

  return {
    ...decoded,
    tenantId,
    workspaceId,
    mode,
    subscriptionTier,
    licenseKey,
    hardwareId,
    deviceId,
  };
};
