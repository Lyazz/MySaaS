# SEO Requirements

## Pages
Per tenant:
- Home
- Category
- Product
- Static: About, Contact

## SEO rules
- SSR/hybrid rendering enabled for public pages
- Clean urls:
  - /p/:productSlug
  - /c/:categorySlug
- Canonical URL per page, per tenant host
- Meta tags: title, description, OG tags
- Product structured data (schema.org Product)
- Sitemap per tenant (and per locale if needed)

## Multi-language
- AR/FR/EN
- Locale routing strategy must be consistent (e.g. /ar, /fr, /en)
- hreflang tags recommended (if implemented)
