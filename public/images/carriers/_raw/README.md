# Raw carrier artwork

Source logos as the carriers publish them — any format, any size, any aspect ratio.

Name each file after its `ShipmentProvider` key, lowercased:

```
maystro.png
yalidine.png
```

Then run:

```bash
npm run logos:carriers
```

That writes normalized 256×256 PNG marks one level up, in `public/images/carriers/`,
which is what `shared/admin/carrier-brand.ts` points at. Keep the raw files here so
the marks can be regenerated when the crop or output size changes.
