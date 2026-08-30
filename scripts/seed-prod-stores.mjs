// Seeds the 14 theme demo stores + the wellness store onto a target (production) database,
// with every product/category image downloaded from the reviewed manifest
// (scripts/store-image-manifest.json), optimized, and uploaded to the target S3 bucket.
//
// Idempotent:
//   - a tenant whose slug already exists is left as-is (structure not re-created);
//   - a product/category that already has an S3-hosted image is skipped unless --force-images.
//
// Required env:
//   PROD_DATABASE_URL   postgres connection string for the target DB
//   S3_ENDPOINT, S3_PUBLIC_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//   (optional) S3_PUBLIC_URL
//
// Usage:
//   PROD_DATABASE_URL=... S3_ENDPOINT=... ... node scripts/seed-prod-stores.mjs [--dry-run] [--force-images] [--only=classic,wellness]
import { readFileSync } from 'fs'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE_IMAGES = args.includes('--force-images')
const ONLY = (args.find((a) => a.startsWith('--only='))?.slice('--only='.length) || '')
    .split(',').map((s) => s.trim()).filter(Boolean)

const DB_URL = process.env.PROD_DATABASE_URL
if (!DB_URL) { console.error('Missing PROD_DATABASE_URL'); process.exit(1) }
for (const k of ['S3_ENDPOINT', 'S3_PUBLIC_BUCKET_NAME', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
    if (!process.env[k]) { console.error(`Missing ${k}`); process.exit(1) }
}

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } })
const BUCKET = process.env.S3_PUBLIC_BUCKET_NAME
const PUBLIC_BASE = (process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT).replace(/\/$/, '')
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const manifest = JSON.parse(readFileSync('scripts/store-image-manifest.json', 'utf8'))
const wellnessStore = JSON.parse(readFileSync('scripts/wellness-store.json', 'utf8'))

// ---------------------------------------------------------------------------
// staff role presets — trimmed copy of backend/src/modules/staff-roles/presets.ts
// (kept identical to scripts/seed-theme-demo-stores.mjs)
// ---------------------------------------------------------------------------
const STAFF_ROLE_PRESETS = [
    { name: 'Gestionnaire commandes', permissions: [
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'orders', actions: ['read', 'update', 'delete'] },
        { resource: 'customers', actions: ['read'] },
        { resource: 'delivery', actions: ['read', 'update'] } ] },
    { name: 'Approvisionnement', permissions: [
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'purchases', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'inventory', actions: ['read', 'update'] },
        { resource: 'products', actions: ['read'] },
        { resource: 'categories', actions: ['read'] } ] },
    { name: 'Gestionnaire catalogue', permissions: [
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'categories', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'variants', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'inventory', actions: ['read', 'update'] },
        { resource: 'metaPixels', actions: ['read', 'update'] } ] },
    { name: 'Caisse', permissions: [
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'cash', actions: ['create', 'read', 'update'] },
        { resource: 'billing', actions: ['read'] },
        { resource: 'orders', actions: ['read', 'update', 'delete'] },
        { resource: 'customers', actions: ['read'] } ] },
    { name: 'Lecture seule', permissions: [
        { resource: 'dashboard', actions: ['read'] },
        { resource: 'statistics', actions: ['read'] },
        { resource: 'products', actions: ['read'] },
        { resource: 'categories', actions: ['read'] },
        { resource: 'variants', actions: ['read'] },
        { resource: 'inventory', actions: ['read'] },
        { resource: 'orders', actions: ['read'] },
        { resource: 'sales', actions: ['read'] },
        { resource: 'purchases', actions: ['read'] },
        { resource: 'suppliers', actions: ['read'] },
        { resource: 'customers', actions: ['read'] },
        { resource: 'delivery', actions: ['read'] },
        { resource: 'cash', actions: ['read'] },
        { resource: 'billing', actions: ['read'] },
        { resource: 'storeSettings', actions: ['read'] },
        { resource: 'homepageSettings', actions: ['read'] },
        { resource: 'contactInfos', actions: ['read'] },
        { resource: 'integrations', actions: ['read'] },
        { resource: 'metaPixels', actions: ['read'] },
        { resource: 'pos', actions: ['read'] } ] }
]
const flattenPreset = (preset) =>
    preset.permissions.flatMap((p) => p.actions.map((action) => ({ resource: p.resource, action })))

async function seedStaffRolePresets(tx, tenantId) {
    for (const preset of STAFF_ROLE_PRESETS) {
        const role = await tx.tenantStaffRole.create({
            data: { name: preset.name, tenant: { connect: { id: tenantId } } },
            select: { id: true }
        })
        const perms = flattenPreset(preset)
        if (perms.length) {
            await tx.tenantStaffRolePermission.createMany({
                data: perms.map((p) => ({ tenantId, roleId: role.id, resource: p.resource, action: p.action })),
                skipDuplicates: true
            })
        }
    }
}

// ---------------------------------------------------------------------------
// theme store structure — identical to scripts/seed-theme-demo-stores.mjs
// (name, categories, product titles, price ranges). Images now come from the manifest.
// ---------------------------------------------------------------------------
const THEMES = [
    { key: 'classic', name: 'Classic', categories: [
        { title: 'Vêtements', priceMin: 2000, priceMax: 15000, products: ['Chemise Oxford','Pantalon Chino','Robe Trapèze','Veste Blazer','Pull Col Rond','Manteau Laine','Jupe Plissée','Cardigan Torsadé','T-shirt Basique','Pantalon Costume'] },
        { title: 'Bijoux', priceMin: 1500, priceMax: 20000, products: ["Collier Perles",'Bracelet Or','Bague Solitaire',"Boucles d'Oreilles Créoles",'Broche Vintage','Pendentif Cœur','Bracelet Chaîne','Collier Ras de Cou','Bague Torsadée','Boucles Perle'] } ] },
    { key: 'modern', name: 'Modern', categories: [
        { title: 'Mode', priceMin: 1500, priceMax: 12000, products: ['Robe Asymétrique','Combinaison Tailleur','Jupe Midi','Top Croisé','Pantalon Palazzo','Veste Structurée','Robe Portefeuille','Blouse Satin','Trench Coat','Ensemble Deux Pièces'] },
        { title: 'Beauté', priceMin: 800, priceMax: 6000, products: ['Sérum Éclat','Crème Hydratante','Fond de Teint','Palette Fards','Rouge à Lèvres Mat','Huile Démaquillante','Masque Argile','Eau de Parfum','Baume Lèvres','Poudre Compacte'] } ] },
    { key: 'street', name: 'Street', categories: [
        { title: 'Sneakers', priceMin: 3000, priceMax: 20000, products: ['Sneakers Basses','Sneakers Montantes','Baskets Running','Baskets Rétro','Sneakers Chunky','Baskets Toile','Sneakers Cuir','Baskets Slip-On','Sneakers Édition Limitée','Baskets Plateforme'] },
        { title: 'Streetwear', priceMin: 2000, priceMax: 15000, products: ['Hoodie Oversize','Sweat Graphique','Cargo Pants','Casquette Snapback','Veste Bomber','T-shirt Print','Jogger Technique','Bonnet Brodé','Sac Banane','Coupe-Vent'] } ] },
    { key: 'cozy', name: 'Cozy', categories: [
        { title: 'Bougies', priceMin: 1000, priceMax: 4000, products: ['Bougie Vanille','Bougie Santal','Bougie Lavande','Bougie Cannelle','Bougie Bois de Cèdre','Bougie Fleur de Coton','Bougie Ambre','Bougie Citron Vert','Bougie Musc Blanc','Bougie Pin Sylvestre'] },
        { title: 'Cadeaux', priceMin: 1500, priceMax: 6000, products: ['Coffret Bien-être','Panier Gourmand','Set Tasses Céramique','Plaid Douillet','Carnet Relié','Coffret Infusions','Bougie et Savon Duo','Trousse Cadeau','Diffuseur Huiles','Coffret Découverte'] } ] },
    { key: 'cyber', name: 'Cyber', categories: [
        { title: 'Électronique', priceMin: 2500, priceMax: 25000, products: ['Casque Sans Fil','Enceinte Bluetooth','Chargeur Rapide','Souris Ergonomique','Clavier Mécanique','Webcam HD','Disque SSD Externe','Powerbank','Câble USB-C','Support Ordinateur'] },
        { title: 'Gaming', priceMin: 3000, priceMax: 45000, products: ['Manette Sans Fil','Casque Gaming RGB','Tapis de Souris XXL','Chaise Gaming','Micro Streaming','Carte Graphique','Volant Course','Écran Gaming 144Hz','Clavier Mécanique RGB','Support Manettes'] } ] },
    { key: 'stationnery', name: 'Stationery', categories: [
        { title: 'Papeterie', priceMin: 200, priceMax: 3000, products: ['Carnet Ligné','Stylo Plume','Set Marqueurs','Agenda Annuel','Bloc-notes Kraft','Trousse Cuir','Surligneurs Pastel','Papier Origami','Enveloppes Kraft','Tampon Personnalisé'] },
        { title: 'Livres', priceMin: 500, priceMax: 3500, products: ['Roman Best-seller','Guide Pratique','Bande Dessinée','Carnet de Voyage','Livre Cuisine','Roman Policier','Essai Contemporain','Livre Jeunesse','Beau Livre Photo','Recueil Poésie'] } ] },
    { key: 'food', name: 'Food', categories: [
        { title: 'Boulangerie', priceMin: 150, priceMax: 1500, products: ['Pain Complet','Croissant Beurre','Baguette Tradition','Brioche Nature','Tarte aux Pommes','Éclair Chocolat','Cookie Pépites','Fougasse Olives','Gâteau Marbré','Muffin Myrtille'] },
        { title: 'Épicerie', priceMin: 200, priceMax: 2500, products: ["Huile d'Olive",'Miel Naturel','Pâtes Artisanales','Confiture Maison','Épices Assorties','Café en Grains','Thé Vert Bio','Riz Basmati','Sauce Tomate','Vinaigre Balsamique'] } ] },
    { key: 'playful', name: 'Playful', categories: [
        { title: 'Jouets', priceMin: 800, priceMax: 6000, products: ['Peluche Ourson','Puzzle 500 Pièces','Voiture Télécommandée','Jeu de Société','Blocs de Construction','Poupée Articulée','Kit Pâte à Modeler','Trottinette Enfant','Jeu de Cartes','Robot Éducatif'] },
        { title: 'Mode enfant', priceMin: 900, priceMax: 5000, products: ['Pyjama Imprimé','Robe Fillette','T-shirt Dinosaure','Salopette Denim','Sweat à Capuche Enfant','Ensemble Deux Pièces Enfant','Chaussons Souples','Bonnet Enfant','Legging Coloré','Manteau Enfant'] } ] },
    { key: 'activewear', name: 'Activewear', categories: [
        { title: 'Sport', priceMin: 1500, priceMax: 8000, products: ['Legging Sport','T-shirt Technique','Short de Running','Brassière Sport','Veste Coupe-Vent','Débardeur Fitness','Jogging Molleton','Sweat Zippé','Short Training','Legging Taille Haute'] },
        { title: 'Plein air', priceMin: 2000, priceMax: 10000, products: ['Sac à Dos Randonnée','Gourde Isotherme','Tente Légère','Sac de Couchage','Bâtons de Randonnée','Veste Imperméable','Lampe Frontale','Chaussures de Trail','Tapis de Camping','Boussole'] } ] },
    { key: 'chrono', name: 'Chrono Luxe', categories: [
        { title: 'Montres', priceMin: 8000, priceMax: 120000, products: ['Montre Chronographe','Montre Automatique','Montre Squelette','Montre Minimaliste','Montre Plongée','Montre Connectée','Montre Vintage','Montre Bracelet Cuir','Montre Acier','Montre Édition Limitée'] },
        { title: 'Lunettes de soleil', priceMin: 4000, priceMax: 30000, products: ['Lunettes Aviateur','Lunettes Rondes','Lunettes Cat-Eye','Lunettes Polarisées','Lunettes Rectangulaires','Lunettes Oversize','Lunettes Écaille','Lunettes Miroir','Lunettes Sport','Lunettes Vintage'] } ] },
    { key: 'maison', name: 'Pistachio', categories: [
        { title: 'Épicerie fine', priceMin: 800, priceMax: 6000, products: ['Huile Truffe','Miel de Lavande',"Confit d'Oignons",'Chocolat Grand Cru',"Caviar d'Aubergine",'Vinaigre Balsamique Vieilli','Pâté de Campagne','Tapenade Olives','Sel de Guérande','Coffret Dégustation'] },
        { title: 'Fruits secs', priceMin: 500, priceMax: 3500, products: ['Pistaches Grillées','Amandes Fumées','Noix de Cajou','Mélange Fruits Secs','Noisettes Torréfiées','Dattes Deglet Nour','Figues Séchées','Abricots Secs','Cacahuètes Enrobées','Pignons de Pin'] } ] },
    { key: 'arena', name: 'Arena', categories: [
        { title: 'Périphériques gaming', priceMin: 3000, priceMax: 30000, products: ['Souris Gaming RGB','Clavier Mécanique Gaming','Tapis de Souris Gaming','Casque Gaming 7.1','Manette Pro Gaming','Support Casque','Hub USB Gaming','Repose-poignet Gaming','Câble Gaming Tressé','Stand Manette'] },
        { title: 'Accessoires esport', priceMin: 3500, priceMax: 60000, products: ['Maillot Esport','Chaise Gaming Pro','Micro Streaming Pro','Webcam Streaming','Éclairage RGB Setup','Bureau Gaming','Filtre Anti-lumière','Carte Capture Vidéo','Bras Support Micro','Tapis Bureau XXL'] } ] },
    { key: 'nour', name: 'Nour Élégance', categories: [
        { title: 'Abayas', priceMin: 4000, priceMax: 25000, products: ['Abaya Noire Classique','Abaya Brodée','Abaya Kimono','Abaya Dubaï','Abaya Perlée','Abaya Évasée','Abaya Satin','Abaya Denim','Abaya Fermeture Zip','Abaya Ceinturée'] },
        { title: 'Hijabs', priceMin: 800, priceMax: 5000, products: ['Hijab Jersey','Hijab Mousseline','Hijab Soie','Hijab Instantané','Hijab Brodé','Hijab Coton','Hijab Chiffon','Hijab Pashmina','Hijab Uni','Hijab Imprimé'] } ] },
    { key: 'embellir', name: 'Embellir', categories: [
        { title: 'Soins visage', priceMin: 1200, priceMax: 8000, products: ['Sérum Vitamine C','Crème Anti-Âge','Nettoyant Doux','Contour des Yeux','Masque Hydratant','Eau Micellaire','Exfoliant Doux','Huile Visage','Tonique Floral','Crème de Nuit'] },
        { title: 'Cosmétiques', priceMin: 900, priceMax: 6000, products: ['Rouge à Lèvres Velours','Palette Yeux','Fond de Teint Fluide','Mascara Volume','Blush Poudre','Enlumineur','Crayon Sourcils','Vernis à Ongles','Eyeliner Précision','Anticernes'] } ] }
]

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const isS3Url = (url) => typeof url === 'string' && url.startsWith(PUBLIC_BASE)

// download -> optimize -> upload to target S3, return public URL
async function pushImage(tenantId, sourceUrl, label) {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`fetch ${res.status} for ${sourceUrl}`)
    const input = Buffer.from(await res.arrayBuffer())
    const optimized = await sharp(input)
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer()
    const nonce = crypto.randomBytes(6).toString('hex')
    const safe = slugify(label, { lower: true, strict: true }).slice(0, 60) || 'image'
    const key = `tenants/${tenantId}/public/${Date.now()}-${nonce}-${safe}.jpg`
    if (DRY_RUN) return `${PUBLIC_BASE}/${BUCKET}/${key}`
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: optimized, ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable'
    }))
    return `${PUBLIC_BASE}/${BUCKET}/${key}`
}

async function setProductImages(tenantId, productId, label, sourceUrls) {
    const existing = await prisma.productImage.findMany({ where: { tenantId, productId }, select: { url: true } })
    if (!FORCE_IMAGES && existing.length && existing.every((e) => isS3Url(e.url))) {
        return { skipped: true }
    }
    const uploaded = []
    for (let i = 0; i < sourceUrls.length; i++) {
        if (!sourceUrls[i]) continue
        uploaded.push(await pushImage(tenantId, sourceUrls[i], `${label}-${i}`))
    }
    if (!uploaded.length) return { skipped: false, uploaded: 0, noSource: true }
    if (DRY_RUN) return { skipped: false, uploaded: uploaded.length }
    await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { tenantId, productId } }),
        prisma.productImage.createMany({
            data: uploaded.map((url, i) => ({ tenantId, productId, url, position: i, isMain: i === 0 }))
        }),
        prisma.product.update({ where: { id: productId }, data: { images: [] } })
    ])
    return { skipped: false, uploaded: uploaded.length }
}

// ---------------------------------------------------------------------------
async function seedThemeStructure(theme) {
    const existing = await prisma.tenant.findUnique({ where: { slug: theme.key } })
    if (existing) return existing.id

    if (DRY_RUN) { console.log(`  [dry-run] would create tenant ${theme.key}`); return null }

    const passwordHash = await bcrypt.hash('password', 10)
    const tenantId = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({ data: { slug: theme.key, name: theme.name, isOffline: false } })
        const cashbox = await tx.cashbox.create({ data: { tenantId: tenant.id, name: 'Caisse principale', isActive: true } })
        await tx.user.create({ data: { email: `admin@${theme.key}.com`, passwordHash, role: 'owner', tenantId: tenant.id, cashboxId: cashbox.id } })
        await seedStaffRolePresets(tx, tenant.id)
        await tx.storeSettings.create({ data: {
            tenantId: tenant.id, defaultCashboxId: cashbox.id, templateKey: theme.key,
            language: 'fr', currencyCode: 'DZD', currencyCountry: 'DZ'
        } })
        const now = new Date()
        await tx.tenantSubscription.create({ data: {
            tenantId: tenant.id, planCode: 'basic', interval: 'month', status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()))
        } })

        let productIndex = 0
        for (const category of theme.categories) {
            const categorySlug = slugify(category.title, { lower: true, strict: true })
            const categoryRecord = await tx.category.create({ data: { tenantId: tenant.id, title: category.title, slug: categorySlug } })
            for (const productTitle of category.products) {
                productIndex += 1
                const price = randomInt(category.priceMin, category.priceMax)
                const stock = randomInt(10, 100)
                const productSlug = `${slugify(productTitle, { lower: true, strict: true })}-${productIndex}`
                const sku = `${theme.key}-${categorySlug.slice(0, 4)}-${productIndex}`.toUpperCase().slice(0, 32)
                const product = await tx.product.create({ data: {
                    tenantId: tenant.id, title: productTitle, slug: productSlug, price, stock,
                    categoryId: categoryRecord.id, isActive: true
                } })
                await tx.productVariant.create({ data: {
                    tenantId: tenant.id, productId: product.id, sku, price, stock, trackInventory: true
                } })
            }
        }
        return tenant.id
    }, { maxWait: 15000, timeout: 60000 })

    console.log(`  created tenant ${theme.key} (${theme.name})`)
    return tenantId
}

const FR_SECTIONS = {
    browseByCategory: { enabled: true, eyebrow: 'Collections', title: 'Parcourir par catégorie' },
    newArrivals: { enabled: true, eyebrow: 'Nouveautés', title: 'Tendances', limit: 6 },
    bestSellers: { enabled: false, eyebrow: 'Meilleures ventes', title: 'Les plus populaires', limit: 6 }
}
const SLIDE_COPY = [
    { title: 'Nouvelle Collection', subtitle: 'Découvrez nos dernières nouveautés.', buttonText: 'Découvrir', buttonHref: '/products' },
    { title: 'Meilleures Ventes', subtitle: 'Les articles les plus populaires du moment.', buttonText: 'Voir', buttonHref: '/products' },
    { title: 'Offres Spéciales', subtitle: "Jusqu'à -50% sur une sélection d'articles.", buttonText: 'Voir les offres', buttonHref: '/products' }
]

async function applyThemeCarousel(themeKey, tenantId) {
    const heroes = manifest.themeHeroes?.[themeKey]
    if (!heroes || !heroes.length) { console.log(`  ! no hero images for ${themeKey}`); return }

    const ss = await prisma.storeSettings.findUnique({ where: { tenantId }, select: { homeConfig: true } })
    const hasCustom = ss?.homeConfig && Array.isArray(ss.homeConfig.carousel)
        && ss.homeConfig.carousel.some((s) => isS3Url(s.imageUrl))
    if (hasCustom && !FORCE_IMAGES) { console.log(`  carousel ${themeKey}: already set`); return }

    const slides = []
    for (let i = 0; i < Math.min(3, heroes.length); i++) {
        const url = await pushImage(tenantId, heroes[i].url, `hero-${i}`)
        slides.push({ ...SLIDE_COPY[i], imageUrl: url })
    }
    const homeConfig = { carousel: slides, sections: FR_SECTIONS }
    if (!DRY_RUN) {
        await prisma.storeSettings.upsert({
            where: { tenantId },
            create: { tenantId, homeConfig },
            update: { homeConfig }
        })
    }
    console.log(`  carousel ${themeKey}: ${slides.length} slides set`)
}

async function applyThemeImages(theme, tenantId) {
    const themeManifest = manifest.themeStores[theme.key]
    if (!themeManifest) { console.log(`  ! no manifest for ${theme.key}`); return }
    let up = 0, skip = 0, nosrc = 0
    for (const category of theme.categories) {
        const catSlug = slugify(category.title, { lower: true, strict: true })
        const catManifest = themeManifest[catSlug]
        if (!catManifest) { console.log(`  ! no manifest for ${theme.key}/${catSlug}`); continue }

        const catRecord = await prisma.category.findFirst({ where: { tenantId, slug: catSlug }, select: { id: true, imageUrl: true } })
        if (catRecord && catManifest.categoryImage && (FORCE_IMAGES || !isS3Url(catRecord.imageUrl))) {
            const url = await pushImage(tenantId, catManifest.categoryImage, `cat-${catSlug}`)
            if (!DRY_RUN) await prisma.category.update({ where: { id: catRecord.id }, data: { imageUrl: url } })
        }

        for (const entry of catManifest.products) {
            const product = await prisma.product.findFirst({
                where: { tenantId, title: entry.product, categoryId: catRecord?.id }, select: { id: true }
            })
            if (!product) { console.log(`  ! product not found ${theme.key}/${entry.product}`); continue }
            const r = await setProductImages(tenantId, product.id, `${catSlug}-${entry.product}`, entry.images.map((im) => im.url))
            if (r.skipped) skip++; else if (r.noSource) nosrc++; else up++
        }
    }
    console.log(`  images ${theme.key}: ${up} set, ${skip} already-s3, ${nosrc} no-source`)
}

// ---------------------------------------------------------------------------
async function seedWellness() {
    const w = wellnessStore
    let tenant = await prisma.tenant.findUnique({ where: { slug: w.tenant.slug } })

    if (!tenant) {
        if (DRY_RUN) { console.log('  [dry-run] would create tenant wellness'); }
        else {
            const passwordHash = await bcrypt.hash('password', 10)
            tenant = await prisma.$transaction(async (tx) => {
                const t = await tx.tenant.create({ data: { slug: w.tenant.slug, name: w.tenant.name, isOffline: false } })
                const cashbox = await tx.cashbox.create({ data: { tenantId: t.id, name: 'Caisse principale', isActive: true } })
                await tx.user.create({ data: { email: `admin@${w.tenant.slug}.com`, passwordHash, role: 'owner', tenantId: t.id, cashboxId: cashbox.id } })
                await seedStaffRolePresets(tx, t.id)
                await tx.storeSettings.create({ data: {
                    tenantId: t.id, defaultCashboxId: cashbox.id,
                    templateKey: w.storeSettings.templateKey || 'wellness',
                    language: w.storeSettings.language || 'fr',
                    currencyCode: w.storeSettings.currencyCode || 'DZD',
                    currencyCountry: w.storeSettings.currencyCountry || 'DZ'
                } })
                const now = new Date()
                await tx.tenantSubscription.create({ data: {
                    tenantId: t.id, planCode: 'basic', interval: 'month', status: 'ACTIVE',
                    currentPeriodStart: now,
                    currentPeriodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()))
                } })
                for (const c of w.categories) {
                    await tx.category.create({ data: { tenantId: t.id, title: c.title, slug: c.slug } })
                }
                for (const p of w.products) {
                    const cat = await tx.category.findFirst({ where: { tenantId: t.id, slug: p.categorySlug }, select: { id: true } })
                    const product = await tx.product.create({ data: {
                        tenantId: t.id, title: p.title, slug: p.slug, price: p.price, stock: p.stock,
                        isActive: p.isActive, categoryId: cat?.id ?? null,
                        miniDescription: p.miniDescription ?? null, description: p.description ?? null
                    } })
                    if (p.variants?.length) {
                        await tx.productVariant.createMany({ data: p.variants.map((v) => ({
                            tenantId: t.id, productId: product.id, sku: v.sku, price: v.price, stock: v.stock,
                            trackInventory: v.trackInventory ?? true
                        })) })
                    } else {
                        await tx.productVariant.create({ data: {
                            tenantId: t.id, productId: product.id, sku: `${p.slug}`.toUpperCase().slice(0, 32),
                            price: p.price, stock: p.stock, trackInventory: true
                        } })
                    }
                }
                return t
            }, { maxWait: 15000, timeout: 60000 })
            console.log('  created tenant wellness')
        }
    }

    if (!tenant) return
    let up = 0, skip = 0, nosrc = 0
    for (const p of w.products) {
        const wm = manifest.wellness[p.title]
        if (!wm) { console.log(`  ! no manifest for wellness/${p.title}`); continue }
        const product = await prisma.product.findFirst({ where: { tenantId: tenant.id, title: p.title }, select: { id: true } })
        if (!product) { console.log(`  ! product not found wellness/${p.title}`); continue }
        const r = await setProductImages(tenant.id, product.id, p.title, wm.images.map((im) => im.url))
        if (r.skipped) skip++; else if (r.noSource) nosrc++; else up++
    }
    console.log(`  images wellness: ${up} set, ${skip} already-s3, ${nosrc} no-source`)
}

// ---------------------------------------------------------------------------
async function main() {
    console.log(`Target DB: ${DB_URL.replace(/:[^:@/]+@/, ':****@')}`)
    console.log(`Target S3: ${PUBLIC_BASE}/${BUCKET}`)
    console.log(DRY_RUN ? '*** DRY RUN — no writes ***' : '*** LIVE RUN ***')
    if (!manifest.complete) console.log('WARNING: manifest is marked incomplete (some searches were rate-limited)')

    const wanted = (key) => !ONLY.length || ONLY.includes(key)

    for (const theme of THEMES) {
        if (!wanted(theme.key)) continue
        console.log(`\n[${theme.key}]`)
        const tenantId = await seedThemeStructure(theme)
        if (tenantId) {
            await applyThemeImages(theme, tenantId)
            await applyThemeCarousel(theme.key, tenantId)
        }
    }

    if (wanted('wellness')) {
        console.log(`\n[wellness]`)
        await seedWellness()
    }

    await prisma.$disconnect()
    console.log('\nDone.')
}

main().catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
})
