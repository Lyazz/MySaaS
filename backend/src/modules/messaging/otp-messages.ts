import type { EmailMessage, MessageLocale } from './messaging.types'

/**
 * Copy for the codes themselves.
 *
 * Kept here rather than in `locales/*.json` because those files ship to the
 * browser and are the *tenant's* storefront vocabulary; this is platform copy,
 * rendered server-side, in the language the visitor picked at request time.
 * French is the default for Algeria, with Arabic laid out RTL.
 *
 * Nothing in the wording tells the reader whether an account exists — the
 * password-reset copy reads the same whether or not the address was found,
 * because a "no account here" mail is an account-enumeration oracle.
 */

export type OtpPurpose = 'REGISTRATION' | 'PASSWORD_RESET'

type Copy = {
    subject: string
    heading: string
    intro: string
    codeLabel: string
    expiry: string
    ignore: string
    footer: string
    smsBody: string
}

const BRAND = 'Swekly'

const COPY: Record<OtpPurpose, Record<MessageLocale, Copy>> = {
    REGISTRATION: {
        fr: {
            subject: `${BRAND} — votre code de vérification`,
            heading: 'Vérifiez votre compte',
            intro: `Utilisez ce code pour finaliser la création de votre boutique ${BRAND}.`,
            codeLabel: 'Votre code',
            expiry: 'Ce code expire dans {minutes} minutes.',
            ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
            footer: `${BRAND} — la plateforme e-commerce des vendeurs algériens.`,
            smsBody: `${BRAND} : votre code de vérification est {code}. Il expire dans {minutes} minutes. Ne le partagez avec personne.`
        },
        ar: {
            subject: `${BRAND} — رمز التحقق الخاص بك`,
            heading: 'تحقق من حسابك',
            intro: `استخدم هذا الرمز لإتمام إنشاء متجرك على ${BRAND}.`,
            codeLabel: 'رمزك',
            expiry: 'ينتهي هذا الرمز خلال {minutes} دقائق.',
            ignore: 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.',
            footer: `${BRAND} — منصة التجارة الإلكترونية للبائعين الجزائريين.`,
            smsBody: `${BRAND}: رمز التحقق هو {code}. ينتهي خلال {minutes} دقائق. لا تشاركه مع أحد.`
        },
        en: {
            subject: `${BRAND} — your verification code`,
            heading: 'Verify your account',
            intro: `Use this code to finish setting up your ${BRAND} store.`,
            codeLabel: 'Your code',
            expiry: 'This code expires in {minutes} minutes.',
            ignore: "If you didn't request this, you can ignore this message.",
            footer: `${BRAND} — the e-commerce platform for Algerian sellers.`,
            smsBody: `${BRAND}: your verification code is {code}. It expires in {minutes} minutes. Do not share it.`
        }
    },
    PASSWORD_RESET: {
        fr: {
            subject: `${BRAND} — réinitialisation de votre mot de passe`,
            heading: 'Réinitialiser votre mot de passe',
            intro: 'Utilisez ce code pour choisir un nouveau mot de passe.',
            codeLabel: 'Votre code',
            expiry: 'Ce code expire dans {minutes} minutes.',
            ignore: "Si vous n'avez pas demandé de réinitialisation, ignorez ce message : votre mot de passe reste inchangé.",
            footer: `${BRAND} — la plateforme e-commerce des vendeurs algériens.`,
            smsBody: `${BRAND} : votre code de réinitialisation est {code}. Il expire dans {minutes} minutes. Ne le partagez avec personne.`
        },
        ar: {
            subject: `${BRAND} — إعادة تعيين كلمة المرور`,
            heading: 'إعادة تعيين كلمة المرور',
            intro: 'استخدم هذا الرمز لاختيار كلمة مرور جديدة.',
            codeLabel: 'رمزك',
            expiry: 'ينتهي هذا الرمز خلال {minutes} دقائق.',
            ignore: 'إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة: كلمة المرور تبقى كما هي.',
            footer: `${BRAND} — منصة التجارة الإلكترونية للبائعين الجزائريين.`,
            smsBody: `${BRAND}: رمز إعادة التعيين هو {code}. ينتهي خلال {minutes} دقائق. لا تشاركه مع أحد.`
        },
        en: {
            subject: `${BRAND} — reset your password`,
            heading: 'Reset your password',
            intro: 'Use this code to choose a new password.',
            codeLabel: 'Your code',
            expiry: 'This code expires in {minutes} minutes.',
            ignore: "If you didn't ask for a reset, ignore this message — your password is unchanged.",
            footer: `${BRAND} — the e-commerce platform for Algerian sellers.`,
            smsBody: `${BRAND}: your reset code is {code}. It expires in {minutes} minutes. Do not share it.`
        }
    }
}

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

const fill = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match))

/**
 * One inline-styled table, no external CSS, no images.
 *
 * Every mail client strips or rewrites something; a code the recipient cannot
 * read is a support ticket. The plain-text part carries the same code, so a
 * client that refuses HTML entirely still works.
 */
export const renderOtpEmail = (input: {
    purpose: OtpPurpose
    locale: MessageLocale
    code: string
    to: string
    ttlMinutes: number
}): EmailMessage => {
    const copy = COPY[input.purpose][input.locale]
    const rtl = input.locale === 'ar'
    const dir = rtl ? 'rtl' : 'ltr'
    const align = rtl ? 'right' : 'left'
    const expiry = fill(copy.expiry, { minutes: input.ttlMinutes })

    const html = `<!doctype html>
<html lang="${input.locale}" dir="${dir}">
<body style="margin:0;padding:0;background:#0b0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111820;border:1px solid #1f2a35;border-radius:16px;padding:32px;" dir="${dir}">
          <tr>
            <td align="${align}" style="color:#c6f432;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">${escapeHtml(BRAND)}</td>
          </tr>
          <tr>
            <td align="${align}" style="padding-top:16px;color:#ffffff;font-size:24px;font-weight:600;line-height:1.3;">${escapeHtml(copy.heading)}</td>
          </tr>
          <tr>
            <td align="${align}" style="padding-top:12px;color:#9fb0c0;font-size:15px;line-height:1.6;">${escapeHtml(copy.intro)}</td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 0 8px;">
              <div style="color:#6f8296;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;padding-bottom:10px;">${escapeHtml(copy.codeLabel)}</div>
              <div style="display:inline-block;background:#0b0f14;border:1px solid #2b3a48;border-radius:12px;padding:16px 28px;color:#c6f432;font-size:34px;font-weight:700;letter-spacing:0.32em;font-family:'SFMono-Regular',Consolas,monospace;" dir="ltr">${escapeHtml(input.code)}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:12px;color:#9fb0c0;font-size:13px;">${escapeHtml(expiry)}</td>
          </tr>
          <tr>
            <td align="${align}" style="padding-top:24px;border-top:1px solid #1f2a35;color:#6f8296;font-size:13px;line-height:1.6;">${escapeHtml(copy.ignore)}</td>
          </tr>
          <tr>
            <td align="${align}" style="padding-top:16px;color:#4d5f70;font-size:12px;">${escapeHtml(copy.footer)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const text = [
        copy.heading,
        '',
        copy.intro,
        '',
        `${copy.codeLabel}: ${input.code}`,
        expiry,
        '',
        copy.ignore,
        '',
        copy.footer
    ].join('\n')

    return { to: input.to, subject: copy.subject, html, text }
}

export const renderOtpSms = (input: {
    purpose: OtpPurpose
    locale: MessageLocale
    code: string
    ttlMinutes: number
}): string => fill(COPY[input.purpose][input.locale].smsBody, { code: input.code, minutes: input.ttlMinutes })
