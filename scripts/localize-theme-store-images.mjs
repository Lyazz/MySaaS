// Repoints the theme demo stores (created by scripts/seed-theme-demo-stores.mjs) at the
// locally-hosted photos in public/seed-images/ instead of remote Unsplash/LoremFlickr URLs.
//
// For every theme category that maps cleanly to one of the 10 local sets
// (clothing, shoes, watches, electronics, books, bags, furniture, perfumes, phones, sports)
// it rewrites category.imageUrl and the product's ProductImage rows to /seed-images/... paths
// (Nuxt serves public/ at the site root, so these resolve on every {slug}.localhost:3000).
//
// Five categories have no matching local set and are LEFT UNTOUCHED:
//   food/Boulangerie, food/Épicerie, playful/Jouets, maison/Épicerie fine, maison/Fruits secs
//
// Idempotent: safe to re-run. Usage: node scripts/localize-theme-store-images.mjs
import { PrismaClient } from '@prisma/client'
import slugify from 'slugify'

const prisma = new PrismaClient()

// theme slug -> ordered categories, each with its ordered product titles (must match
// seed-theme-demo-stores.mjs exactly) and the public/seed-images/ set to pull from.
// set === null  => leave this category's images untouched.
const THEMES = [
    {
        slug: 'classic',
        categories: [
            { title: 'Vêtements', set: 'clothing', products: ['Chemise Oxford', 'Pantalon Chino', 'Robe Trapèze', 'Veste Blazer', 'Pull Col Rond', 'Manteau Laine', 'Jupe Plissée', 'Cardigan Torsadé', 'T-shirt Basique', 'Pantalon Costume'] },
            { title: 'Bijoux', set: 'watches', products: ["Collier Perles", 'Bracelet Or', 'Bague Solitaire', "Boucles d'Oreilles Créoles", 'Broche Vintage', 'Pendentif Cœur', 'Bracelet Chaîne', 'Collier Ras de Cou', 'Bague Torsadée', 'Boucles Perle'] }
        ]
    },
    {
        slug: 'modern',
        categories: [
            { title: 'Mode', set: 'clothing', products: ['Robe Asymétrique', 'Combinaison Tailleur', 'Jupe Midi', 'Top Croisé', 'Pantalon Palazzo', 'Veste Structurée', 'Robe Portefeuille', 'Blouse Satin', 'Trench Coat', 'Ensemble Deux Pièces'] },
            { title: 'Beauté', set: 'perfumes', products: ['Sérum Éclat', 'Crème Hydratante', 'Fond de Teint', 'Palette Fards', 'Rouge à Lèvres Mat', 'Huile Démaquillante', 'Masque Argile', 'Eau de Parfum', 'Baume Lèvres', 'Poudre Compacte'] }
        ]
    },
    {
        slug: 'street',
        categories: [
            { title: 'Sneakers', set: 'shoes', products: ['Sneakers Basses', 'Sneakers Montantes', 'Baskets Running', 'Baskets Rétro', 'Sneakers Chunky', 'Baskets Toile', 'Sneakers Cuir', 'Baskets Slip-On', 'Sneakers Édition Limitée', 'Baskets Plateforme'] },
            { title: 'Streetwear', set: 'clothing', products: ['Hoodie Oversize', 'Sweat Graphique', 'Cargo Pants', 'Casquette Snapback', 'Veste Bomber', 'T-shirt Print', 'Jogger Technique', 'Bonnet Brodé', 'Sac Banane', 'Coupe-Vent'] }
        ]
    },
    {
        slug: 'cozy',
        categories: [
            { title: 'Bougies', set: 'furniture', products: ['Bougie Vanille', 'Bougie Santal', 'Bougie Lavande', 'Bougie Cannelle', 'Bougie Bois de Cèdre', 'Bougie Fleur de Coton', 'Bougie Ambre', 'Bougie Citron Vert', 'Bougie Musc Blanc', 'Bougie Pin Sylvestre'] },
            { title: 'Cadeaux', set: 'bags', products: ['Coffret Bien-être', 'Panier Gourmand', 'Set Tasses Céramique', 'Plaid Douillet', 'Carnet Relié', 'Coffret Infusions', 'Bougie et Savon Duo', 'Trousse Cadeau', 'Diffuseur Huiles', 'Coffret Découverte'] }
        ]
    },
    {
        slug: 'cyber',
        categories: [
            { title: 'Électronique', set: 'electronics', products: ['Casque Sans Fil', 'Enceinte Bluetooth', 'Chargeur Rapide', 'Souris Ergonomique', 'Clavier Mécanique', 'Webcam HD', 'Disque SSD Externe', 'Powerbank', 'Câble USB-C', 'Support Ordinateur'] },
            { title: 'Gaming', set: 'electronics', products: ['Manette Sans Fil', 'Casque Gaming RGB', 'Tapis de Souris XXL', 'Chaise Gaming', 'Micro Streaming', 'Carte Graphique', 'Volant Course', 'Écran Gaming 144Hz', 'Clavier Mécanique RGB', 'Support Manettes'] }
        ]
    },
    {
        slug: 'stationnery',
        categories: [
            { title: 'Papeterie', set: 'books', products: ['Carnet Ligné', 'Stylo Plume', 'Set Marqueurs', 'Agenda Annuel', 'Bloc-notes Kraft', 'Trousse Cuir', 'Surligneurs Pastel', 'Papier Origami', 'Enveloppes Kraft', 'Tampon Personnalisé'] },
            { title: 'Livres', set: 'books', products: ['Roman Best-seller', 'Guide Pratique', 'Bande Dessinée', 'Carnet de Voyage', 'Livre Cuisine', 'Roman Policier', 'Essai Contemporain', 'Livre Jeunesse', 'Beau Livre Photo', 'Recueil Poésie'] }
        ]
    },
    {
        slug: 'food',
        categories: [
            { title: 'Boulangerie', set: null, products: [] },
            { title: 'Épicerie', set: null, products: [] }
        ]
    },
    {
        slug: 'playful',
        categories: [
            { title: 'Jouets', set: null, products: [] },
            { title: 'Mode enfant', set: 'clothing', products: ['Pyjama Imprimé', 'Robe Fillette', 'T-shirt Dinosaure', 'Salopette Denim', 'Sweat à Capuche Enfant', 'Ensemble Deux Pièces Enfant', 'Chaussons Souples', 'Bonnet Enfant', 'Legging Coloré', 'Manteau Enfant'] }
        ]
    },
    {
        slug: 'activewear',
        categories: [
            { title: 'Sport', set: 'sports', products: ['Legging Sport', 'T-shirt Technique', 'Short de Running', 'Brassière Sport', 'Veste Coupe-Vent', 'Débardeur Fitness', 'Jogging Molleton', 'Sweat Zippé', 'Short Training', 'Legging Taille Haute'] },
            { title: 'Plein air', set: 'sports', products: ['Sac à Dos Randonnée', 'Gourde Isotherme', 'Tente Légère', 'Sac de Couchage', 'Bâtons de Randonnée', 'Veste Imperméable', 'Lampe Frontale', 'Chaussures de Trail', 'Tapis de Camping', 'Boussole'] }
        ]
    },
    {
        slug: 'chrono',
        categories: [
            { title: 'Montres', set: 'watches', products: ['Montre Chronographe', 'Montre Automatique', 'Montre Squelette', 'Montre Minimaliste', 'Montre Plongée', 'Montre Connectée', 'Montre Vintage', 'Montre Bracelet Cuir', 'Montre Acier', 'Montre Édition Limitée'] },
            { title: 'Lunettes de soleil', set: 'perfumes', products: ['Lunettes Aviateur', 'Lunettes Rondes', 'Lunettes Cat-Eye', 'Lunettes Polarisées', 'Lunettes Rectangulaires', 'Lunettes Oversize', 'Lunettes Écaille', 'Lunettes Miroir', 'Lunettes Sport', 'Lunettes Vintage'] }
        ]
    },
    {
        slug: 'maison',
        categories: [
            { title: 'Épicerie fine', set: null, products: [] },
            { title: 'Fruits secs', set: null, products: [] }
        ]
    },
    {
        slug: 'arena',
        categories: [
            { title: 'Périphériques gaming', set: 'electronics', products: ['Souris Gaming RGB', 'Clavier Mécanique Gaming', 'Tapis de Souris Gaming', 'Casque Gaming 7.1', 'Manette Pro Gaming', 'Support Casque', 'Hub USB Gaming', 'Repose-poignet Gaming', 'Câble Gaming Tressé', 'Stand Manette'] },
            { title: 'Accessoires esport', set: 'electronics', products: ['Maillot Esport', 'Chaise Gaming Pro', 'Micro Streaming Pro', 'Webcam Streaming', 'Éclairage RGB Setup', 'Bureau Gaming', 'Filtre Anti-lumière', 'Carte Capture Vidéo', 'Bras Support Micro', 'Tapis Bureau XXL'] }
        ]
    },
    {
        slug: 'nour',
        categories: [
            { title: 'Abayas', set: 'clothing', products: ['Abaya Noire Classique', 'Abaya Brodée', 'Abaya Kimono', 'Abaya Dubaï', 'Abaya Perlée', 'Abaya Évasée', 'Abaya Satin', 'Abaya Denim', 'Abaya Fermeture Zip', 'Abaya Ceinturée'] },
            { title: 'Hijabs', set: 'clothing', products: ['Hijab Jersey', 'Hijab Mousseline', 'Hijab Soie', 'Hijab Instantané', 'Hijab Brodé', 'Hijab Coton', 'Hijab Chiffon', 'Hijab Pashmina', 'Hijab Uni', 'Hijab Imprimé'] }
        ]
    },
    {
        slug: 'embellir',
        categories: [
            { title: 'Soins visage', set: 'perfumes', products: ['Sérum Vitamine C', 'Crème Anti-Âge', 'Nettoyant Doux', 'Contour des Yeux', 'Masque Hydratant', 'Eau Micellaire', 'Exfoliant Doux', 'Huile Visage', 'Tonique Floral', 'Crème de Nuit'] },
            { title: 'Cosmétiques', set: 'perfumes', products: ['Rouge à Lèvres Velours', 'Palette Yeux', 'Fond de Teint Fluide', 'Mascara Volume', 'Blush Poudre', 'Enlumineur', 'Crayon Sourcils', 'Vernis à Ongles', 'Eyeliner Précision', 'Anticernes'] }
        ]
    }
]

const catImage = (set) => `/seed-images/cat-${set}.jpg`
// each set has prod-<set>-<0..9>-<0|1>.jpg ; offset shifts the 10-photo window when the
// same set is used by a second category in the same store, to cut down on repeats.
const prodImage = (set, index, slot, offset) => `/seed-images/prod-${set}-${(index + offset) % 10}-${slot}.jpg`

async function localizeTheme(theme) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: theme.slug } })
    if (!tenant) {
        console.log(`skip  ${theme.slug} — tenant not found`)
        return { categories: 0, products: 0, skipped: theme.categories.length }
    }

    const setUses = {}
    let touchedCategories = 0
    let touchedProducts = 0
    let skipped = 0

    for (const category of theme.categories) {
        if (!category.set) {
            skipped += 1
            console.log(`      ${theme.slug}/${category.title} — left untouched (no local set)`)
            continue
        }

        const offset = (setUses[category.set] || 0) * 5
        setUses[category.set] = (setUses[category.set] || 0) + 1

        const categorySlug = slugify(category.title, { lower: true, strict: true })
        const categoryRecord = await prisma.category.findFirst({
            where: { tenantId: tenant.id, slug: categorySlug }
        })
        if (!categoryRecord) {
            skipped += 1
            console.log(`      ${theme.slug}/${category.title} — category row not found, skipped`)
            continue
        }

        await prisma.category.update({
            where: { id: categoryRecord.id },
            data: { imageUrl: catImage(category.set) }
        })
        touchedCategories += 1

        for (let i = 0; i < category.products.length; i++) {
            const productTitle = category.products[i]
            const product = await prisma.product.findFirst({
                where: { tenantId: tenant.id, title: productTitle, categoryId: categoryRecord.id }
            })
            if (!product) {
                console.log(`      ${theme.slug}/${category.title}/${productTitle} — product not found, skipped`)
                continue
            }

            const urls = [
                { url: prodImage(category.set, i, 0, offset), position: 0, isMain: true },
                { url: prodImage(category.set, i, 1, offset), position: 1, isMain: false }
            ]

            await prisma.$transaction([
                prisma.productImage.deleteMany({ where: { tenantId: tenant.id, productId: product.id } }),
                prisma.productImage.createMany({
                    data: urls.map((u) => ({ tenantId: tenant.id, productId: product.id, ...u }))
                }),
                // legacy array field is deprecated but wins over the relation when non-empty; keep it clear
                prisma.product.update({ where: { id: product.id }, data: { images: [] } })
            ])
            touchedProducts += 1
        }

        console.log(`done  ${theme.slug}/${category.title} — set "${category.set}"${offset ? ` (offset ${offset})` : ''}, ${category.products.length} products`)
    }

    return { categories: touchedCategories, products: touchedProducts, skipped }
}

async function main() {
    let totals = { categories: 0, products: 0, skipped: 0 }
    for (const theme of THEMES) {
        const r = await localizeTheme(theme)
        totals.categories += r.categories
        totals.products += r.products
        totals.skipped += r.skipped
    }
    console.log(`\n=== Résumé ===`)
    console.log(`Catégories repointées : ${totals.categories}`)
    console.log(`Produits repointés    : ${totals.products}`)
    console.log(`Catégories inchangées : ${totals.skipped}`)
    await prisma.$disconnect()
}

main().catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
})
