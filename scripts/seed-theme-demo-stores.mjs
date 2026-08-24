// Creates one demo tenant per storefront theme (named after the theme, like the existing
// `wellness` tenant) and seeds it with 2 categories and 20 products with distinct photos.
// Usage: node scripts/seed-theme-demo-stores.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import slugify from 'slugify'

const prisma = new PrismaClient()

// Trimmed copy of backend/src/modules/staff-roles/presets.ts (that file is TypeScript and
// can't be imported from this plain ESM script).
const STAFF_ROLE_PRESETS = [
    {
        name: 'Gestionnaire commandes',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'orders', actions: ['read', 'update', 'delete'] },
            { resource: 'customers', actions: ['read'] },
            { resource: 'delivery', actions: ['read', 'update'] }
        ]
    },
    {
        name: 'Approvisionnement',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'purchases', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'inventory', actions: ['read', 'update'] },
            { resource: 'products', actions: ['read'] },
            { resource: 'categories', actions: ['read'] }
        ]
    },
    {
        name: 'Gestionnaire catalogue',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'categories', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'variants', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'inventory', actions: ['read', 'update'] },
            { resource: 'metaPixels', actions: ['read', 'update'] }
        ]
    },
    {
        name: 'Caisse',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'cash', actions: ['create', 'read', 'update'] },
            { resource: 'billing', actions: ['read'] },
            { resource: 'orders', actions: ['read', 'update', 'delete'] },
            { resource: 'customers', actions: ['read'] }
        ]
    },
    {
        name: 'Lecture seule',
        permissions: [
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
            { resource: 'pos', actions: ['read'] }
        ]
    }
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

// Theme -> store identity, categories (2 per theme, 10 products each = 20 products/theme).
// `keyword` drives LoremFlickr (https://loremflickr.com/800/800/<keyword>?lock=n) so photos
// actually match the theme's niche, each locked to a unique id for a distinct photo per image.
const THEMES = [
    {
        key: 'classic',
        name: 'Classic',
        categories: [
            {
                title: 'Vêtements', keyword: 'clothing', priceMin: 2000, priceMax: 15000,
                products: ['Chemise Oxford', 'Pantalon Chino', 'Robe Trapèze', 'Veste Blazer', 'Pull Col Rond', 'Manteau Laine', 'Jupe Plissée', 'Cardigan Torsadé', 'T-shirt Basique', 'Pantalon Costume']
            },
            {
                title: 'Bijoux', keyword: 'jewelry', priceMin: 1500, priceMax: 20000,
                products: ["Collier Perles", 'Bracelet Or', 'Bague Solitaire', "Boucles d'Oreilles Créoles", 'Broche Vintage', 'Pendentif Cœur', 'Bracelet Chaîne', 'Collier Ras de Cou', 'Bague Torsadée', 'Boucles Perle']
            }
        ]
    },
    {
        key: 'modern',
        name: 'Modern',
        categories: [
            {
                title: 'Mode', keyword: 'fashion', priceMin: 1500, priceMax: 12000,
                products: ['Robe Asymétrique', 'Combinaison Tailleur', 'Jupe Midi', 'Top Croisé', 'Pantalon Palazzo', 'Veste Structurée', 'Robe Portefeuille', 'Blouse Satin', 'Trench Coat', 'Ensemble Deux Pièces']
            },
            {
                title: 'Beauté', keyword: 'beauty', priceMin: 800, priceMax: 6000,
                products: ['Sérum Éclat', 'Crème Hydratante', 'Fond de Teint', 'Palette Fards', 'Rouge à Lèvres Mat', 'Huile Démaquillante', 'Masque Argile', 'Eau de Parfum', 'Baume Lèvres', 'Poudre Compacte']
            }
        ]
    },
    {
        key: 'street',
        name: 'Street',
        categories: [
            {
                title: 'Sneakers', keyword: 'sneakers', priceMin: 3000, priceMax: 20000,
                products: ['Sneakers Basses', 'Sneakers Montantes', 'Baskets Running', 'Baskets Rétro', 'Sneakers Chunky', 'Baskets Toile', 'Sneakers Cuir', 'Baskets Slip-On', 'Sneakers Édition Limitée', 'Baskets Plateforme']
            },
            {
                title: 'Streetwear', keyword: 'streetwear', priceMin: 2000, priceMax: 15000,
                products: ['Hoodie Oversize', 'Sweat Graphique', 'Cargo Pants', 'Casquette Snapback', 'Veste Bomber', 'T-shirt Print', 'Jogger Technique', 'Bonnet Brodé', 'Sac Banane', 'Coupe-Vent']
            }
        ]
    },
    {
        key: 'cozy',
        name: 'Cozy',
        categories: [
            {
                title: 'Bougies', keyword: 'candle', priceMin: 1000, priceMax: 4000,
                products: ['Bougie Vanille', 'Bougie Santal', 'Bougie Lavande', 'Bougie Cannelle', 'Bougie Bois de Cèdre', 'Bougie Fleur de Coton', 'Bougie Ambre', 'Bougie Citron Vert', 'Bougie Musc Blanc', 'Bougie Pin Sylvestre']
            },
            {
                title: 'Cadeaux', keyword: 'gift', priceMin: 1500, priceMax: 6000,
                products: ['Coffret Bien-être', 'Panier Gourmand', 'Set Tasses Céramique', 'Plaid Douillet', 'Carnet Relié', 'Coffret Infusions', 'Bougie et Savon Duo', 'Trousse Cadeau', 'Diffuseur Huiles', 'Coffret Découverte']
            }
        ]
    },
    {
        key: 'cyber',
        name: 'Cyber',
        categories: [
            {
                title: 'Électronique', keyword: 'electronics', priceMin: 2500, priceMax: 25000,
                products: ['Casque Sans Fil', 'Enceinte Bluetooth', 'Chargeur Rapide', 'Souris Ergonomique', 'Clavier Mécanique', 'Webcam HD', 'Disque SSD Externe', 'Powerbank', 'Câble USB-C', 'Support Ordinateur']
            },
            {
                title: 'Gaming', keyword: 'gaming', priceMin: 3000, priceMax: 45000,
                products: ['Manette Sans Fil', 'Casque Gaming RGB', 'Tapis de Souris XXL', 'Chaise Gaming', 'Micro Streaming', 'Carte Graphique', 'Volant Course', 'Écran Gaming 144Hz', 'Clavier Mécanique RGB', 'Support Manettes']
            }
        ]
    },
    {
        key: 'stationnery',
        name: 'Stationery',
        categories: [
            {
                title: 'Papeterie', keyword: 'stationery', priceMin: 200, priceMax: 3000,
                products: ['Carnet Ligné', 'Stylo Plume', 'Set Marqueurs', 'Agenda Annuel', 'Bloc-notes Kraft', 'Trousse Cuir', 'Surligneurs Pastel', 'Papier Origami', 'Enveloppes Kraft', 'Tampon Personnalisé']
            },
            {
                title: 'Livres', keyword: 'books', priceMin: 500, priceMax: 3500,
                products: ['Roman Best-seller', 'Guide Pratique', 'Bande Dessinée', 'Carnet de Voyage', 'Livre Cuisine', 'Roman Policier', 'Essai Contemporain', 'Livre Jeunesse', 'Beau Livre Photo', 'Recueil Poésie']
            }
        ]
    },
    {
        key: 'food',
        name: 'Food',
        categories: [
            {
                title: 'Boulangerie', keyword: 'bakery', priceMin: 150, priceMax: 1500,
                products: ['Pain Complet', 'Croissant Beurre', 'Baguette Tradition', 'Brioche Nature', 'Tarte aux Pommes', 'Éclair Chocolat', 'Cookie Pépites', 'Fougasse Olives', 'Gâteau Marbré', 'Muffin Myrtille']
            },
            {
                title: 'Épicerie', keyword: 'grocery', priceMin: 200, priceMax: 2500,
                products: ["Huile d'Olive", 'Miel Naturel', 'Pâtes Artisanales', 'Confiture Maison', 'Épices Assorties', 'Café en Grains', 'Thé Vert Bio', 'Riz Basmati', 'Sauce Tomate', 'Vinaigre Balsamique']
            }
        ]
    },
    {
        key: 'playful',
        name: 'Playful',
        categories: [
            {
                title: 'Jouets', keyword: 'toys', priceMin: 800, priceMax: 6000,
                products: ['Peluche Ourson', 'Puzzle 500 Pièces', 'Voiture Télécommandée', 'Jeu de Société', 'Blocs de Construction', 'Poupée Articulée', 'Kit Pâte à Modeler', 'Trottinette Enfant', 'Jeu de Cartes', 'Robot Éducatif']
            },
            {
                title: 'Mode enfant', keyword: 'kids', priceMin: 900, priceMax: 5000,
                products: ['Pyjama Imprimé', 'Robe Fillette', 'T-shirt Dinosaure', 'Salopette Denim', 'Sweat à Capuche Enfant', 'Ensemble Deux Pièces Enfant', 'Chaussons Souples', 'Bonnet Enfant', 'Legging Coloré', 'Manteau Enfant']
            }
        ]
    },
    {
        key: 'activewear',
        name: 'Activewear',
        categories: [
            {
                title: 'Sport', keyword: 'sportswear', priceMin: 1500, priceMax: 8000,
                products: ['Legging Sport', 'T-shirt Technique', 'Short de Running', 'Brassière Sport', 'Veste Coupe-Vent', 'Débardeur Fitness', 'Jogging Molleton', 'Sweat Zippé', 'Short Training', 'Legging Taille Haute']
            },
            {
                title: 'Plein air', keyword: 'outdoor', priceMin: 2000, priceMax: 10000,
                products: ['Sac à Dos Randonnée', 'Gourde Isotherme', 'Tente Légère', 'Sac de Couchage', 'Bâtons de Randonnée', 'Veste Imperméable', 'Lampe Frontale', 'Chaussures de Trail', 'Tapis de Camping', 'Boussole']
            }
        ]
    },
    {
        key: 'chrono',
        name: 'Chrono Luxe',
        categories: [
            {
                title: 'Montres', keyword: 'watch', priceMin: 8000, priceMax: 120000,
                products: ['Montre Chronographe', 'Montre Automatique', 'Montre Squelette', 'Montre Minimaliste', 'Montre Plongée', 'Montre Connectée', 'Montre Vintage', 'Montre Bracelet Cuir', 'Montre Acier', 'Montre Édition Limitée']
            },
            {
                title: 'Lunettes de soleil', keyword: 'sunglasses', priceMin: 4000, priceMax: 30000,
                products: ['Lunettes Aviateur', 'Lunettes Rondes', 'Lunettes Cat-Eye', 'Lunettes Polarisées', 'Lunettes Rectangulaires', 'Lunettes Oversize', 'Lunettes Écaille', 'Lunettes Miroir', 'Lunettes Sport', 'Lunettes Vintage']
            }
        ]
    },
    {
        key: 'maison',
        name: 'Pistachio',
        categories: [
            {
                title: 'Épicerie fine', keyword: 'gourmet', priceMin: 800, priceMax: 6000,
                products: ['Huile Truffe', 'Miel de Lavande', "Confit d'Oignons", 'Chocolat Grand Cru', "Caviar d'Aubergine", 'Vinaigre Balsamique Vieilli', 'Pâté de Campagne', 'Tapenade Olives', 'Sel de Guérande', 'Coffret Dégustation']
            },
            {
                title: 'Fruits secs', keyword: 'nuts', priceMin: 500, priceMax: 3500,
                products: ['Pistaches Grillées', 'Amandes Fumées', 'Noix de Cajou', 'Mélange Fruits Secs', 'Noisettes Torréfiées', 'Dattes Deglet Nour', 'Figues Séchées', 'Abricots Secs', 'Cacahuètes Enrobées', 'Pignons de Pin']
            }
        ]
    },
    {
        key: 'arena',
        name: 'Arena',
        categories: [
            {
                title: 'Périphériques gaming', keyword: 'gaming', priceMin: 3000, priceMax: 30000,
                products: ['Souris Gaming RGB', 'Clavier Mécanique Gaming', 'Tapis de Souris Gaming', 'Casque Gaming 7.1', 'Manette Pro Gaming', 'Support Casque', 'Hub USB Gaming', 'Repose-poignet Gaming', 'Câble Gaming Tressé', 'Stand Manette']
            },
            {
                title: 'Accessoires esport', keyword: 'esports', priceMin: 3500, priceMax: 60000,
                products: ['Maillot Esport', 'Chaise Gaming Pro', 'Micro Streaming Pro', 'Webcam Streaming', 'Éclairage RGB Setup', 'Bureau Gaming', 'Filtre Anti-lumière', 'Carte Capture Vidéo', 'Bras Support Micro', 'Tapis Bureau XXL']
            }
        ]
    },
    {
        key: 'nour',
        name: 'Nour Élégance',
        categories: [
            {
                title: 'Abayas', keyword: 'abaya', priceMin: 4000, priceMax: 25000,
                products: ['Abaya Noire Classique', 'Abaya Brodée', 'Abaya Kimono', 'Abaya Dubaï', 'Abaya Perlée', 'Abaya Évasée', 'Abaya Satin', 'Abaya Denim', 'Abaya Fermeture Zip', 'Abaya Ceinturée']
            },
            {
                title: 'Hijabs', keyword: 'hijab', priceMin: 800, priceMax: 5000,
                products: ['Hijab Jersey', 'Hijab Mousseline', 'Hijab Soie', 'Hijab Instantané', 'Hijab Brodé', 'Hijab Coton', 'Hijab Chiffon', 'Hijab Pashmina', 'Hijab Uni', 'Hijab Imprimé']
            }
        ]
    },
    {
        key: 'embellir',
        name: 'Embellir',
        categories: [
            {
                title: 'Soins visage', keyword: 'skincare', priceMin: 1200, priceMax: 8000,
                products: ['Sérum Vitamine C', 'Crème Anti-Âge', 'Nettoyant Doux', 'Contour des Yeux', 'Masque Hydratant', 'Eau Micellaire', 'Exfoliant Doux', 'Huile Visage', 'Tonique Floral', 'Crème de Nuit']
            },
            {
                title: 'Cosmétiques', keyword: 'cosmetics', priceMin: 900, priceMax: 6000,
                products: ['Rouge à Lèvres Velours', 'Palette Yeux', 'Fond de Teint Fluide', 'Mascara Volume', 'Blush Poudre', 'Enlumineur', 'Crayon Sourcils', 'Vernis à Ongles', 'Eyeliner Précision', 'Anticernes']
            }
        ]
    }
]

let lock = 1000
const image = (keyword) => {
    lock += 1
    return `https://loremflickr.com/800/800/${encodeURIComponent(keyword)}?lock=${lock}`
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

async function seedTheme(theme) {
    const existing = await prisma.tenant.findUnique({ where: { slug: theme.key } })
    if (existing) {
        console.log(`skip  ${theme.key} — tenant already exists`)
        return
    }

    const passwordHash = await bcrypt.hash('password', 10)

    await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
            data: { slug: theme.key, name: theme.name, isOffline: false }
        })

        const cashbox = await tx.cashbox.create({
            data: { tenantId: tenant.id, name: 'Caisse principale', isActive: true }
        })

        await tx.user.create({
            data: {
                email: `admin@${theme.key}.com`,
                passwordHash,
                role: 'owner',
                tenantId: tenant.id,
                cashboxId: cashbox.id
            }
        })

        await seedStaffRolePresets(tx, tenant.id)

        await tx.storeSettings.create({
            data: {
                tenantId: tenant.id,
                defaultCashboxId: cashbox.id,
                templateKey: theme.key,
                language: 'fr',
                currencyCode: 'DZD',
                currencyCountry: 'DZ'
            }
        })

        const now = new Date()
        await tx.tenantSubscription.create({
            data: {
                tenantId: tenant.id,
                planCode: 'basic',
                interval: 'month',
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()))
            }
        })

        let productIndex = 0
        for (const category of theme.categories) {
            const categorySlug = slugify(category.title, { lower: true, strict: true })
            const categoryRecord = await tx.category.create({
                data: {
                    tenantId: tenant.id,
                    title: category.title,
                    slug: categorySlug,
                    imageUrl: image(category.keyword)
                }
            })

            for (const productTitle of category.products) {
                productIndex += 1
                const price = randomInt(category.priceMin, category.priceMax)
                const stock = randomInt(10, 100)
                const productSlug = `${slugify(productTitle, { lower: true, strict: true })}-${productIndex}`
                const sku = `${theme.key}-${categorySlug.slice(0, 4)}-${productIndex}`.toUpperCase().slice(0, 32)

                const product = await tx.product.create({
                    data: {
                        tenantId: tenant.id,
                        title: productTitle,
                        slug: productSlug,
                        price,
                        stock,
                        categoryId: categoryRecord.id,
                        isActive: true
                    }
                })

                await tx.productVariant.create({
                    data: {
                        tenantId: tenant.id,
                        productId: product.id,
                        sku,
                        price,
                        stock,
                        trackInventory: true
                    }
                })

                await tx.productImage.create({
                    data: { tenantId: tenant.id, productId: product.id, url: image(category.keyword), position: 0, isMain: true }
                })
                await tx.productImage.create({
                    data: { tenantId: tenant.id, productId: product.id, url: image(category.keyword), position: 1, isMain: false }
                })
            }
        }
    }, { maxWait: 15000, timeout: 60000 })

    console.log(`done  ${theme.key} (${theme.name}) — tenant + 2 catégories + 20 produits créés`)
}

async function main() {
    for (const theme of THEMES) {
        try {
            await seedTheme(theme)
        } catch (err) {
            console.error(`fail  ${theme.key} —`, err.message)
        }
    }
    await prisma.$disconnect()
}

main()
