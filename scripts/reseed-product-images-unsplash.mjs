// Replaces the LoremFlickr placeholder photos on the theme demo stores (created by
// scripts/seed-theme-demo-stores.mjs) with real Unsplash search results, one search per
// category so it stays comfortably under Unsplash's 50 req/hour free-tier limit.
//
// Each returned photo is checked against a list of expected English keywords for its
// category (matched against Unsplash's own alt_description/description/tags) before being
// assigned to a product — photos that don't match anything get flagged in the summary log
// instead of silently passing as "coherent".
//
// Usage: UNSPLASH_ACCESS_KEY=xxxxx node scripts/reseed-product-images-unsplash.mjs
import { PrismaClient } from '@prisma/client'
import slugify from 'slugify'

const prisma = new PrismaClient()
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
if (!ACCESS_KEY) {
    console.error('Missing UNSPLASH_ACCESS_KEY env var')
    process.exit(1)
}

// theme key -> categories, each with its own Unsplash search query and the products
// (in the exact order they were created by seed-theme-demo-stores.mjs) plus the
// English keywords that count as a "coherent" match for this category.
const THEME_CATEGORIES = [
    { theme: 'classic', category: 'Vêtements', query: 'classic clothing fashion', checkTerms: ['shirt', 'dress', 'jacket', 'sweater', 'coat', 'skirt', 'cardigan', 't-shirt', 'pants', 'trouser', 'clothing', 'fashion', 'blazer'], products: ['Chemise Oxford', 'Pantalon Chino', 'Robe Trapèze', 'Veste Blazer', 'Pull Col Rond', 'Manteau Laine', 'Jupe Plissée', 'Cardigan Torsadé', 'T-shirt Basique', 'Pantalon Costume'] },
    { theme: 'classic', category: 'Bijoux', query: 'jewelry accessories', checkTerms: ['necklace', 'bracelet', 'ring', 'earring', 'brooch', 'pendant', 'jewelry', 'jewellery', 'gold', 'pearl'], products: ["Collier Perles", 'Bracelet Or', 'Bague Solitaire', "Boucles d'Oreilles Créoles", 'Broche Vintage', 'Pendentif Cœur', 'Bracelet Chaîne', 'Collier Ras de Cou', 'Bague Torsadée', 'Boucles Perle'] },

    { theme: 'modern', category: 'Mode', query: 'womens clothing flatlay', checkTerms: ['dress', 'skirt', 'top', 'pants', 'blazer', 'coat', 'blouse', 'fashion', 'outfit', 'suit'], products: ['Robe Asymétrique', 'Combinaison Tailleur', 'Jupe Midi', 'Top Croisé', 'Pantalon Palazzo', 'Veste Structurée', 'Robe Portefeuille', 'Blouse Satin', 'Trench Coat', 'Ensemble Deux Pièces'] },
    { theme: 'modern', category: 'Beauté', query: 'beauty cosmetics skincare product', checkTerms: ['serum', 'cream', 'makeup', 'cosmetic', 'lipstick', 'perfume', 'skincare', 'beauty', 'powder', 'mask'], products: ['Sérum Éclat', 'Crème Hydratante', 'Fond de Teint', 'Palette Fards', 'Rouge à Lèvres Mat', 'Huile Démaquillante', 'Masque Argile', 'Eau de Parfum', 'Baume Lèvres', 'Poudre Compacte'] },

    { theme: 'street', category: 'Sneakers', query: 'sneakers shoes', checkTerms: ['sneaker', 'shoe', 'trainer', 'footwear'], products: ['Sneakers Basses', 'Sneakers Montantes', 'Baskets Running', 'Baskets Rétro', 'Sneakers Chunky', 'Baskets Toile', 'Sneakers Cuir', 'Baskets Slip-On', 'Sneakers Édition Limitée', 'Baskets Plateforme'] },
    { theme: 'street', category: 'Streetwear', query: 'streetwear hoodie clothing', checkTerms: ['hoodie', 'sweatshirt', 'jacket', 'cap', 'streetwear', 'pants', 'bag', 'cargo', 'beanie'], products: ['Hoodie Oversize', 'Sweat Graphique', 'Cargo Pants', 'Casquette Snapback', 'Veste Bomber', 'T-shirt Print', 'Jogger Technique', 'Bonnet Brodé', 'Sac Banane', 'Coupe-Vent'] },

    { theme: 'cozy', category: 'Bougies', query: 'scented candle', checkTerms: ['candle', 'wax', 'wick'], products: ['Bougie Vanille', 'Bougie Santal', 'Bougie Lavande', 'Bougie Cannelle', 'Bougie Bois de Cèdre', 'Bougie Fleur de Coton', 'Bougie Ambre', 'Bougie Citron Vert', 'Bougie Musc Blanc', 'Bougie Pin Sylvestre'] },
    { theme: 'cozy', category: 'Cadeaux', query: 'gift box basket cozy', checkTerms: ['gift', 'box', 'basket', 'mug', 'blanket', 'notebook', 'tea', 'soap', 'diffuser', 'cozy'], products: ['Coffret Bien-être', 'Panier Gourmand', 'Set Tasses Céramique', 'Plaid Douillet', 'Carnet Relié', 'Coffret Infusions', 'Bougie et Savon Duo', 'Trousse Cadeau', 'Diffuseur Huiles', 'Coffret Découverte'] },

    { theme: 'cyber', category: 'Électronique', query: 'computer accessories peripherals', checkTerms: ['headphone', 'speaker', 'charger', 'mouse', 'keyboard', 'webcam', 'ssd', 'drive', 'cable', 'laptop', 'electronic'], products: ['Casque Sans Fil', 'Enceinte Bluetooth', 'Chargeur Rapide', 'Souris Ergonomique', 'Clavier Mécanique', 'Webcam HD', 'Disque SSD Externe', 'Powerbank', 'Câble USB-C', 'Support Ordinateur'] },
    { theme: 'cyber', category: 'Gaming', query: 'gaming setup gear', checkTerms: ['controller', 'headset', 'mouse', 'chair', 'microphone', 'graphics card', 'gpu', 'wheel', 'monitor', 'keyboard', 'gaming'], products: ['Manette Sans Fil', 'Casque Gaming RGB', 'Tapis de Souris XXL', 'Chaise Gaming', 'Micro Streaming', 'Carte Graphique', 'Volant Course', 'Écran Gaming 144Hz', 'Clavier Mécanique RGB', 'Support Manettes'] },

    { theme: 'stationnery', category: 'Papeterie', query: 'stationery office supplies', checkTerms: ['notebook', 'pen', 'marker', 'planner', 'notepad', 'pencil', 'highlighter', 'paper', 'envelope', 'stamp', 'stationery'], products: ['Carnet Ligné', 'Stylo Plume', 'Set Marqueurs', 'Agenda Annuel', 'Bloc-notes Kraft', 'Trousse Cuir', 'Surligneurs Pastel', 'Papier Origami', 'Enveloppes Kraft', 'Tampon Personnalisé'] },
    { theme: 'stationnery', category: 'Livres', query: 'books reading', checkTerms: ['book', 'novel', 'comic', 'journal', 'cookbook', 'reading'], products: ['Roman Best-seller', 'Guide Pratique', 'Bande Dessinée', 'Carnet de Voyage', 'Livre Cuisine', 'Roman Policier', 'Essai Contemporain', 'Livre Jeunesse', 'Beau Livre Photo', 'Recueil Poésie'] },

    { theme: 'food', category: 'Boulangerie', query: 'bakery bread pastry', checkTerms: ['bread', 'croissant', 'baguette', 'brioche', 'tart', 'eclair', 'cookie', 'cake', 'muffin', 'bakery', 'pastry'], products: ['Pain Complet', 'Croissant Beurre', 'Baguette Tradition', 'Brioche Nature', 'Tarte aux Pommes', 'Éclair Chocolat', 'Cookie Pépites', 'Fougasse Olives', 'Gâteau Marbré', 'Muffin Myrtille'] },
    { theme: 'food', category: 'Épicerie', query: 'grocery pantry ingredients', checkTerms: ['oil', 'honey', 'pasta', 'jam', 'spice', 'coffee', 'tea', 'rice', 'sauce', 'vinegar', 'grocery'], products: ["Huile d'Olive", 'Miel Naturel', 'Pâtes Artisanales', 'Confiture Maison', 'Épices Assorties', 'Café en Grains', 'Thé Vert Bio', 'Riz Basmati', 'Sauce Tomate', 'Vinaigre Balsamique'] },

    { theme: 'playful', category: 'Jouets', query: 'kids toys', checkTerms: ['teddy', 'bear', 'puzzle', 'car', 'toy', 'board game', 'block', 'doll', 'robot', 'scooter', 'cards'], products: ['Peluche Ourson', 'Puzzle 500 Pièces', 'Voiture Télécommandée', 'Jeu de Société', 'Blocs de Construction', 'Poupée Articulée', 'Kit Pâte à Modeler', 'Trottinette Enfant', 'Jeu de Cartes', 'Robot Éducatif'] },
    { theme: 'playful', category: 'Mode enfant', query: 'children clothing flatlay', checkTerms: ['kid', 'child', 'pajama', 'dress', 'shirt', 'overalls', 'hoodie', 'shoe', 'hat', 'legging', 'coat'], products: ['Pyjama Imprimé', 'Robe Fillette', 'T-shirt Dinosaure', 'Salopette Denim', 'Sweat à Capuche Enfant', 'Ensemble Deux Pièces Enfant', 'Chaussons Souples', 'Bonnet Enfant', 'Legging Coloré', 'Manteau Enfant'] },

    { theme: 'activewear', category: 'Sport', query: 'activewear clothing flatlay', checkTerms: ['legging', 'shirt', 'shorts', 'bra', 'jacket', 'tank', 'jogger', 'hoodie', 'sport', 'fitness', 'athletic'], products: ['Legging Sport', 'T-shirt Technique', 'Short de Running', 'Brassière Sport', 'Veste Coupe-Vent', 'Débardeur Fitness', 'Jogging Molleton', 'Sweat Zippé', 'Short Training', 'Legging Taille Haute'] },
    { theme: 'activewear', category: 'Plein air', query: 'camping hiking equipment gear', checkTerms: ['backpack', 'bottle', 'tent', 'sleeping bag', 'pole', 'jacket', 'headlamp', 'shoe', 'mat', 'compass', 'hiking', 'outdoor'], products: ['Sac à Dos Randonnée', 'Gourde Isotherme', 'Tente Légère', 'Sac de Couchage', 'Bâtons de Randonnée', 'Veste Imperméable', 'Lampe Frontale', 'Chaussures de Trail', 'Tapis de Camping', 'Boussole'] },

    { theme: 'chrono', category: 'Montres', query: 'luxury wristwatch', checkTerms: ['watch', 'wristwatch', 'clock', 'timepiece'], products: ['Montre Chronographe', 'Montre Automatique', 'Montre Squelette', 'Montre Minimaliste', 'Montre Plongée', 'Montre Connectée', 'Montre Vintage', 'Montre Bracelet Cuir', 'Montre Acier', 'Montre Édition Limitée'] },
    { theme: 'chrono', category: 'Lunettes de soleil', query: 'sunglasses', checkTerms: ['sunglasses', 'glasses', 'eyewear'], products: ['Lunettes Aviateur', 'Lunettes Rondes', 'Lunettes Cat-Eye', 'Lunettes Polarisées', 'Lunettes Rectangulaires', 'Lunettes Oversize', 'Lunettes Écaille', 'Lunettes Miroir', 'Lunettes Sport', 'Lunettes Vintage'] },

    { theme: 'maison', category: 'Épicerie fine', query: 'gourmet food jar artisan', checkTerms: ['oil', 'honey', 'jam', 'chocolate', 'vinegar', 'pate', 'olive', 'salt', 'gift', 'gourmet', 'jar'], products: ['Huile Truffe', 'Miel de Lavande', "Confit d'Oignons", 'Chocolat Grand Cru', "Caviar d'Aubergine", 'Vinaigre Balsamique Vieilli', 'Pâté de Campagne', 'Tapenade Olives', 'Sel de Guérande', 'Coffret Dégustation'] },
    { theme: 'maison', category: 'Fruits secs', query: 'dried fruit and nuts', checkTerms: ['pistachio', 'almond', 'cashew', 'nut', 'hazelnut', 'date', 'fig', 'apricot', 'peanut', 'pine nut', 'dried fruit'], products: ['Pistaches Grillées', 'Amandes Fumées', 'Noix de Cajou', 'Mélange Fruits Secs', 'Noisettes Torréfiées', 'Dattes Deglet Nour', 'Figues Séchées', 'Abricots Secs', 'Cacahuètes Enrobées', 'Pignons de Pin'] },

    { theme: 'arena', category: 'Périphériques gaming', query: 'gaming peripherals mouse keyboard', checkTerms: ['mouse', 'keyboard', 'mouse pad', 'headset', 'controller', 'hub', 'cable', 'stand', 'gaming'], products: ['Souris Gaming RGB', 'Clavier Mécanique Gaming', 'Tapis de Souris Gaming', 'Casque Gaming 7.1', 'Manette Pro Gaming', 'Support Casque', 'Hub USB Gaming', 'Repose-poignet Gaming', 'Câble Gaming Tressé', 'Stand Manette'] },
    { theme: 'arena', category: 'Accessoires esport', query: 'esports streaming setup', checkTerms: ['jersey', 'chair', 'microphone', 'webcam', 'light', 'desk', 'glasses', 'capture card', 'mat', 'esport', 'streaming'], products: ['Maillot Esport', 'Chaise Gaming Pro', 'Micro Streaming Pro', 'Webcam Streaming', 'Éclairage RGB Setup', 'Bureau Gaming', 'Filtre Anti-lumière', 'Carte Capture Vidéo', 'Bras Support Micro', 'Tapis Bureau XXL'] },

    { theme: 'nour', category: 'Abayas', query: 'abaya', checkTerms: ['abaya', 'kaftan', 'gown', 'robe', 'dress', 'hijab', 'headscarf'], products: ['Abaya Noire Classique', 'Abaya Brodée', 'Abaya Kimono', 'Abaya Dubaï', 'Abaya Perlée', 'Abaya Évasée', 'Abaya Satin', 'Abaya Denim', 'Abaya Fermeture Zip', 'Abaya Ceinturée'] },
    { theme: 'nour', category: 'Hijabs', query: 'hijab scarf', checkTerms: ['hijab', 'scarf', 'headscarf'], products: ['Hijab Jersey', 'Hijab Mousseline', 'Hijab Soie', 'Hijab Instantané', 'Hijab Brodé', 'Hijab Coton', 'Hijab Chiffon', 'Hijab Pashmina', 'Hijab Uni', 'Hijab Imprimé'] },

    { theme: 'embellir', category: 'Soins visage', query: 'facial skincare product', checkTerms: ['serum', 'cream', 'cleanser', 'mask', 'water', 'oil', 'toner', 'skincare', 'face'], products: ['Sérum Vitamine C', 'Crème Anti-Âge', 'Nettoyant Doux', 'Contour des Yeux', 'Masque Hydratant', 'Eau Micellaire', 'Exfoliant Doux', 'Huile Visage', 'Tonique Floral', 'Crème de Nuit'] },
    { theme: 'embellir', category: 'Cosmétiques', query: 'makeup cosmetics', checkTerms: ['lipstick', 'eyeshadow', 'foundation', 'mascara', 'blush', 'highlighter', 'eyebrow', 'nail polish', 'eyeliner', 'concealer', 'makeup'], products: ['Rouge à Lèvres Velours', 'Palette Yeux', 'Fond de Teint Fluide', 'Mascara Volume', 'Blush Poudre', 'Enlumineur', 'Crayon Sourcils', 'Vernis à Ongles', 'Eyeliner Précision', 'Anticernes'] }
]

async function searchUnsplash(query) {
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '30')
    url.searchParams.set('orientation', 'squarish')
    url.searchParams.set('content_filter', 'high')

    const res = await fetch(url, { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } })
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Unsplash ${res.status}: ${body.slice(0, 300)}`)
    }
    const data = await res.json()
    return data.results ?? []
}

function isCoherent(photo, checkTerms) {
    const text = [photo.alt_description, photo.description, ...(photo.tags?.map((t) => t.title) ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
    return checkTerms.some((term) => text.includes(term))
}

async function main() {
    let totalVerified = 0
    let totalUnverified = 0
    const unverifiedLog = []

    // Optional: node reseed-product-images-unsplash.mjs "theme/Category" "theme2/Category2"
    // restricts the run to just those groups, to fix specific weak spots without burning
    // the whole 50 req/hour Unsplash budget on categories that already came out fine.
    const filters = process.argv.slice(2)
    const groups = filters.length
        ? THEME_CATEGORIES.filter((g) => filters.includes(`${g.theme}/${g.category}`))
        : THEME_CATEGORIES

    for (const group of groups) {
        const tenant = await prisma.tenant.findUnique({ where: { slug: group.theme } })
        if (!tenant) {
            console.error(`fail  ${group.theme}/${group.category} — tenant not found, run seed-theme-demo-stores.mjs first`)
            continue
        }
        const categorySlug = slugify(group.category, { lower: true, strict: true })
        const category = await prisma.category.findUnique({
            where: { tenantId_slug: { tenantId: tenant.id, slug: categorySlug } }
        }).catch(() => null)

        let results
        try {
            results = await searchUnsplash(group.query)
        } catch (err) {
            console.error(`fail  ${group.theme}/${group.category} — Unsplash search error: ${err.message}`)
            continue
        }

        const verified = results.filter((p) => isCoherent(p, group.checkTerms))
        const unverified = results.filter((p) => !isCoherent(p, group.checkTerms))
        const pool = [...verified, ...unverified]
        const needed = group.products.length * 2

        if (pool.length < needed) {
            console.warn(`warn  ${group.theme}/${group.category} — only ${pool.length} Unsplash results for ${needed} needed, some photos will repeat`)
        }

        if (category) {
            const catPhoto = pool[0]
            if (catPhoto) {
                await prisma.category.update({ where: { id: category.id }, data: { imageUrl: catPhoto.urls.regular } })
            }
        }

        let cursor = 0
        const nextPhoto = () => {
            const photo = pool[cursor % pool.length]
            cursor += 1
            return photo
        }

        for (const productTitle of group.products) {
            const product = await prisma.product.findFirst({
                where: { tenantId: tenant.id, title: productTitle, categoryId: category?.id }
            })
            if (!product) {
                console.error(`fail  ${group.theme}/${group.category}/${productTitle} — product not found`)
                continue
            }

            const photo1 = nextPhoto()
            const photo2 = nextPhoto()
            if (!photo1 || !photo2) continue

            await prisma.productImage.deleteMany({ where: { tenantId: tenant.id, productId: product.id } })
            await prisma.productImage.create({
                data: { tenantId: tenant.id, productId: product.id, url: photo1.urls.regular, position: 0, isMain: true }
            })
            await prisma.productImage.create({
                data: { tenantId: tenant.id, productId: product.id, url: photo2.urls.regular, position: 1, isMain: false }
            })

            for (const [photo, slot] of [[photo1, 1], [photo2, 2]]) {
                const coherent = isCoherent(photo, group.checkTerms)
                if (coherent) {
                    totalVerified += 1
                } else {
                    totalUnverified += 1
                    unverifiedLog.push({
                        theme: group.theme,
                        product: productTitle,
                        slot,
                        alt: photo.alt_description || photo.description || '(no description)',
                        url: photo.urls.regular
                    })
                }
            }
        }

        console.log(`done  ${group.theme}/${group.category} — ${verified.length}/${results.length} results keyword-verified, assigned to ${group.products.length} products`)
    }

    console.log(`\n=== Résumé vérification cohérence ===`)
    console.log(`Images vérifiées par mot-clé  : ${totalVerified}`)
    console.log(`Images NON vérifiées          : ${totalUnverified}`)
    if (unverifiedLog.length) {
        console.log(`\nÀ contrôler manuellement (aucun mot-clé attendu trouvé dans la description Unsplash) :`)
        for (const item of unverifiedLog) {
            console.log(`  [${item.theme}] ${item.product} (image ${item.slot}) — "${item.alt}" — ${item.url}`)
        }
    }

    await prisma.$disconnect()
}

main().catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
})
