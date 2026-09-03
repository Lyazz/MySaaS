# Account Verification & Password Reset

Signup and "mot de passe oublié" both run on one-time codes, and the visitor
picks how the code reaches them: **email, SMS, or WhatsApp**. The screens only
offer channels the server can actually deliver on, so a deployment with mail
credentials and nothing else shows one button, not three dead ones.

## The flow

```
POST /api/auth/otp/send        purpose + channel + email|phone  → a code goes out
POST /api/auth/otp/verify      the six digits                   → a single-use token
POST /api/register             the token + the signup form      → the tenant is created
```

Password reset is the same middle step with a different purpose:

```
POST /api/auth/password/forgot channel + email|phone            → a code goes out
POST /api/auth/otp/verify      purpose=PASSWORD_RESET           → a single-use token
POST /api/auth/password/reset  the token + the new password     → password changed
```

`GET /api/auth/otp/channels` is what the screens call on load to learn which
channels exist, how long a code lives, and how long the resend button waits.

### Why a token and not just "verified: true"

`/api/auth/otp/verify` hands back a `verificationToken`, and that token — not
the six digits — is what the next call spends. It means:

- the code cannot be replayed after the step it belongs to;
- a reset stays pinned to the account resolved when the code was **sent**, so
  the final request cannot be repointed at somebody else;
- a double-clicked submit spends it once (`consumedAt` is claimed atomically).

### What is never revealed

`/api/auth/password/forgot` answers identically whether or not an account
exists. An address with no account still gets a `VerificationCode` row written —
only the send is skipped — because otherwise the 60-second resend cooldown would
fire for a real address and not for a made-up one, and that difference is an
enumeration oracle on its own. A code nobody was sent cannot be guessed, and
`resetPassword` refuses any row with no `userId`.

The masked destination in the response (`m•••@gmail.com`) is built from what the
caller already typed, so it tells a prober nothing new.

## Limits

| Limit | Value | Where |
|---|---|---|
| Code length / lifetime | 6 digits, 10 minutes | `verification.service.ts` |
| Wrong guesses before the code burns | 5 | `verification.service.ts` |
| Resend cooldown, per destination | 60 s | `verification.service.ts` |
| Codes per destination, per hour | 5 | `verification.service.ts` |
| Requests per IP, per 15 min | 20 POSTs to `/api/auth/**` | `rate-limit.middleware.ts` |

The per-destination limits live in the database because the abuse that costs
real money is one phone number pounded from many addresses — something an
IP-keyed limiter never sees.

Codes are stored as an HMAC keyed by `OTP_SECRET` (falling back to
`JWT_SECRET`), never in clear text.

## Environment

### Requiring verification

```bash
# Default: on. Set to "false" only where no provider can be configured.
REGISTER_REQUIRE_VERIFICATION=true

# Optional: separate secret for the code HMAC. Defaults to JWT_SECRET.
OTP_SECRET=...
```

### Email

Pick one provider, or leave `EMAIL_PROVIDER` unset and it is inferred from
whichever API key is present.

```bash
EMAIL_PROVIDER=resend            # resend | brevo | mailgun | log
EMAIL_FROM=no-reply@swekly.com   # required by every provider except `log`
EMAIL_FROM_NAME=Swekly

RESEND_API_KEY=...
# or
BREVO_API_KEY=...
# or
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=mg.swekly.com
MAILGUN_REGION=eu               # omit for the US region
```

`log` prints the message to the server console instead of sending it. It is the
default in development and **refuses to count as configured in production** — a
live deployment dropping password resets into stdout is worse than telling the
user email is unavailable.

### SMS

```bash
SMS_PROVIDER=twilio             # twilio | brevo | webhook | log
SMS_SENDER_ID=Swekly

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...        # or TWILIO_MESSAGING_SERVICE_SID=MG...

# Brevo
BREVO_API_KEY=...

# Any local Algerian aggregator that accepts JSON
SMS_WEBHOOK_URL=https://gateway.example.dz/send
SMS_WEBHOOK_HEADERS={"X-Api-Key":"..."}
```

The `webhook` provider POSTs `{ "to": "213...", "sender": "...", "message": "..." }`
and treats any 2xx as sent — enough for most local gateways without writing a
provider for each.

### WhatsApp

This is the **platform's own** WhatsApp number, not a tenant's. The per-tenant
WABA in `modules/whatsapp` sends order messages; a signup code has no tenant
yet, and a password reset must not be delivered by the shop the user is trying
to get back into.

```bash
PLATFORM_WHATSAPP_ACCESS_TOKEN=...
PLATFORM_WHATSAPP_PHONE_NUMBER_ID=...
PLATFORM_WHATSAPP_OTP_TEMPLATE=swekly_verification_code
PLATFORM_WHATSAPP_OTP_LANGUAGES=fr,ar,en_US   # only what Meta actually approved
PLATFORM_WHATSAPP_OTP_BUTTON=true             # false if the template has no button
```

Meta only allows a one-time code inside an **AUTHENTICATION**-category template,
which has to be created and approved once per language on the platform WABA
before this channel works. Until that is done, leave the variables unset — the
channel simply is not offered.

## Development and tests

```bash
# Echoes the code back in the send response. Requires NODE_ENV !== production.
OTP_DEV_ECHO=true
```

With no provider configured at all, `log` covers email and SMS in development,
so the whole flow is runnable on a laptop: the code appears in the terminal that
runs `npm run dev`.

- `tests/api/account-verification.test.ts` drives both flows over HTTP using
  `OTP_DEV_ECHO`.
- `tests/setup.ts` sets `REGISTER_REQUIRE_VERIFICATION=false`, because the suite
  registers hundreds of tenants and has no inbox. That test file turns it back
  on for the cases that are about the gate itself.
- `playwright.config.ts` sets `OTP_DEV_ECHO`, and the signup spec reads the code
  out of the `/api/auth/otp/send` response.

## Database

`VerificationCode` is the one table in the schema that is deliberately **not**
tenant-scoped: a registration code is issued before the tenant it will create
exists, and a reset arrives on the SaaS domain with no tenant in the Host
header. Its `tenantId` records which tenant a reset resolved to; it is never the
scope of a query. `User` gained `phone`, `emailVerifiedAt` and `phoneVerifiedAt`
in the same migration.
