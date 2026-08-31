// Adds 8 theme-appropriate categories (5 products each) to every theme demo store on the
// target DB, so each store has 10 categories. Prices are realistic Algerian retail values
// (rounded). Images come from Pexels, optimized, uploaded to the target S3 bucket.
//
// Idempotent: a category whose slug already exists on the tenant is skipped entirely.
//
// Env: PROD_DATABASE_URL, S3_ENDPOINT, S3_PUBLIC_BUCKET_NAME, AWS_REGION,
//      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, PEXELS_API_KEY
// Usage: node --env-file=... scripts/extend-prod-catalog.mjs [--dry-run] [--only=classic,nour]
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import slugify from 'slugify'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const DRY = process.argv.includes('--dry-run')
const ONLY = (process.argv.find((a) => a.startsWith('--only='))?.slice(7) || '').split(',').map((s) => s.trim()).filter(Boolean)

const prisma = new PrismaClient({ datasources: { db: { url: process.env.PROD_DATABASE_URL } } })
const BUCKET = process.env.S3_PUBLIC_BUCKET_NAME
const BASE = (process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT).replace(/\/$/, '')
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
})

function niceDZD(value) {
    const p = Number(value)
    if (!Number.isFinite(p) || p <= 0) return p
    if (p < 1000) return Math.max(50, Math.round(p / 50) * 50)
    if (p < 20000) return Math.floor(p / 100) * 100
    if (p < 50000) return Math.round(p / 1000) * 1000
    return Math.round(p / 5000) * 5000
}
const rnd = (min, max) => Math.random() * (max - min) + min

// theme slug -> 8 extra categories. c=title, q=pexels query, k=coherence keywords,
// lo/hi=price range DZD, p=5 product names.
const EXTRA = {
    classic: [
        { c: 'Chaussures', q: 'leather dress shoes', k: ['shoe','leather','loafer','oxford','footwear'], lo: 4000, hi: 18000, p: ['Mocassins Cuir', 'Derbies Vernies', 'Escarpins Classiques', 'Bottines Chelsea', 'Richelieu Cuir'] },
        { c: 'Sacs à Main', q: 'leather handbag', k: ['bag','handbag','purse','leather','tote'], lo: 5000, hi: 22000, p: ['Sac Cabas Cuir', 'Pochette de Soirée', 'Sac Bandoulière', 'Sac Seau', 'Sac à Rabat'] },
        { c: 'Ceintures', q: 'leather belt', k: ['belt','leather','buckle'], lo: 1500, hi: 6000, p: ['Ceinture Cuir Lisse', 'Ceinture Réversible', 'Ceinture Tressée', 'Ceinture Fine', 'Ceinture Boucle Dorée'] },
        { c: 'Écharpes & Foulards', q: 'wool scarf silk', k: ['scarf','wool','silk','shawl','foulard'], lo: 2000, hi: 9000, p: ['Écharpe Laine', 'Foulard Soie', 'Étole Cachemire', 'Écharpe à Franges', 'Foulard Imprimé'] },
        { c: 'Chemises', q: 'men dress shirt', k: ['shirt','dress shirt','collar','clothing'], lo: 2500, hi: 9000, p: ['Chemise Blanche', 'Chemise Rayée', 'Chemise Lin', 'Chemise à Carreaux', 'Chemise Cintrée'] },
        { c: 'Manteaux & Vestes', q: 'wool coat jacket', k: ['coat','jacket','wool','blazer','trench'], lo: 6000, hi: 25000, p: ['Manteau Long en Laine', 'Trench Beige', 'Blazer Croisé Marine', 'Caban Officier', 'Veste Matelassée'] },
        { c: 'Lunettes de Vue', q: 'eyeglasses frames', k: ['glasses','eyeglasses','frame','eyewear','spectacles'], lo: 3000, hi: 12000, p: ['Monture Ronde', 'Monture Écaille', 'Monture Métal Fin', 'Monture Carrée', 'Monture Titane'] },
        { c: 'Parfums', q: 'perfume bottle', k: ['perfume','fragrance','bottle','cologne'], lo: 4000, hi: 18000, p: ['Eau de Parfum Boisée', 'Eau de Toilette Fraîche', 'Parfum Ambré', 'Cologne Agrumes', 'Coffret Parfum'] }
    ],
    modern: [
        { c: 'Chaussures', q: 'women heels shoes fashion', k: ['shoe','heel','sandal','footwear','boot'], lo: 3500, hi: 15000, p: ['Escarpins Pointus', 'Sandales à Talon', 'Mules Cuir', 'Bottines Talon', 'Baskets Mode'] },
        { c: 'Sacs', q: 'designer handbag', k: ['bag','handbag','purse','tote','clutch'], lo: 4000, hi: 20000, p: ['Sac Structuré', 'Mini Sac', 'Sac Hobo', 'Cabas XL', 'Pochette Chaîne'] },
        { c: 'Bijoux Fantaisie', q: 'costume jewelry', k: ['jewelry','necklace','earring','bracelet','ring'], lo: 1000, hi: 6000, p: ['Créoles Dorées', 'Collier Multi-rangs', 'Bracelet Jonc', 'Bague Ajustable', "Boucles d'Oreilles Perles"] },
        { c: 'Lunettes de Soleil', q: 'sunglasses fashion', k: ['sunglasses','glasses','eyewear','shades'], lo: 3000, hi: 12000, p: ['Lunettes Oversize', 'Lunettes Cat-Eye', 'Lunettes Rectangulaires', 'Lunettes Teintées', 'Lunettes Fines'] },
        { c: 'Maquillage', q: 'makeup products flat lay', k: ['makeup','lipstick','mascara','palette','cosmetic'], lo: 800, hi: 6000, p: ['Rouge à Lèvres Mat', 'Palette Nude', 'Mascara Volume', 'Fond de Teint Fluide', 'Blush Crème'] },
        { c: 'Parfums', q: 'perfume fragrance', k: ['perfume','fragrance','bottle','scent'], lo: 4000, hi: 16000, p: ['Parfum Floral', 'Parfum Oriental', 'Brume Corps', 'Eau Fraîche', 'Coffret Découverte'] },
        { c: 'Accessoires Cheveux', q: 'hair accessories clips', k: ['hair','clip','scrunchie','headband','barrette'], lo: 500, hi: 3000, p: ['Pince Griffe', 'Barrette Perlée', 'Chouchou Satin', 'Serre-tête', 'Set Épingles'] },
        { c: 'Lingerie', q: 'lingerie set', k: ['lingerie','bra','underwear','set','intimates'], lo: 1500, hi: 8000, p: ['Ensemble Dentelle', 'Body Sculptant', 'Nuisette Satin', 'Culotte Taille Haute', 'Soutien-gorge Sans Couture'] }
    ],
    street: [
        { c: 'Casquettes & Bonnets', q: 'cap beanie streetwear', k: ['cap','beanie','hat','snapback'], lo: 1000, hi: 5000, p: ['Casquette Snapback', 'Bonnet Côtelé', 'Casquette Trucker', 'Bob Bucket', 'Bonnet Brodé'] },
        { c: 'Sacs & Sacoches', q: 'crossbody bag backpack streetwear', k: ['bag','backpack','crossbody','sling','pack'], lo: 2000, hi: 12000, p: ['Sac Banane', 'Sac à Dos Technique', 'Sacoche Bandoulière', 'Tote Bag Canvas', 'Mini Sac Utilitaire'] },
        { c: 'Accessoires', q: 'streetwear accessories chain', k: ['chain','necklace','sunglasses','accessory','watch'], lo: 800, hi: 6000, p: ['Chaîne Cubaine', 'Lunettes Y2K', 'Bracelet Silicone', 'Portefeuille Chaîne', 'Bague Signet'] },
        { c: 'T-shirts', q: 'graphic tshirt streetwear', k: ['t-shirt','tee','shirt','graphic','print'], lo: 1500, hi: 6000, p: ['T-shirt Graphique', 'T-shirt Oversize', 'T-shirt Tie-Dye', 'Tee Manches Longues', 'T-shirt Logo'] },
        { c: 'Pantalons & Joggings', q: 'cargo pants joggers', k: ['pants','cargo','jogger','trousers','sweatpants'], lo: 2500, hi: 10000, p: ['Cargo Pants', 'Jogger Molleton', 'Parachute Pants', 'Pantalon Nylon', 'Short Cargo'] },
        { c: 'Vestes', q: 'bomber jacket denim streetwear', k: ['jacket','bomber','denim','coat','windbreaker'], lo: 4000, hi: 18000, p: ['Veste Bomber', 'Veste en Jean', 'Coupe-Vent', 'Veste Workwear', 'Veste Polaire'] },
        { c: 'Chaussettes', q: 'crew socks streetwear', k: ['sock','socks','crew','hosiery'], lo: 500, hi: 2500, p: ['Chaussettes Hautes', 'Pack 3 Paires', 'Chaussettes Logo', 'Chaussettes Rayées', 'Chaussettes Techniques'] },
        { c: 'Skate & Accessoires', q: 'skateboard deck', k: ['skateboard','skate','deck','board','wheels'], lo: 3000, hi: 15000, p: ['Planche Complète', 'Deck Érable', 'Jeu de Roues', 'Roulements ABEC', 'Grip Tape'] }
    ],
    cozy: [
        { c: 'Décoration', q: 'home decor cozy neutral', k: ['decor','vase','frame','ornament','home'], lo: 1500, hi: 9000, p: ['Vase Céramique', 'Cadre Photo Bois', 'Panier Tressé', 'Miroir Rond', 'Guirlande Lumineuse'] },
        { c: 'Linge de Maison', q: 'bedding linen blanket', k: ['bedding','linen','blanket','sheet','duvet'], lo: 2000, hi: 12000, p: ['Parure de Lit Lin', 'Couverture Gaufrée', 'Housse de Couette', 'Taies Lavées', 'Jeté de Lit'] },
        { c: 'Diffuseurs & Senteurs', q: 'reed diffuser home fragrance', k: ['diffuser','fragrance','scent','reed','spray'], lo: 1500, hi: 7000, p: ['Diffuseur à Bâtonnets', 'Spray d\'Ambiance', 'Diffuseur Ultrasonique', 'Recharge Parfum', 'Pot-Pourri'] },
        { c: 'Tasses & Mugs', q: 'ceramic mug cup', k: ['mug','cup','ceramic','tea','coffee'], lo: 800, hi: 3500, p: ['Mug Grès Émaillé', 'Tasse & Sous-tasse', 'Mug Isotherme', 'Set de 2 Mugs', 'Tasse à Thé'] },
        { c: 'Plaids & Coussins', q: 'cushion pillow throw blanket', k: ['cushion','pillow','throw','blanket','plaid'], lo: 1500, hi: 8000, p: ['Plaid Grosse Maille', 'Coussin Velours', 'Coussin à Franges', 'Plaid Sherpa', 'Housse de Coussin Lin'] },
        { c: 'Papeterie & Carnets', q: 'notebook journal stationery cozy', k: ['notebook','journal','pen','stationery','planner'], lo: 500, hi: 3000, p: ['Carnet Relié', 'Journal Quotidien', 'Set Stylos', 'Bloc Notes', 'Marque-pages'] },
        { c: 'Thé & Infusions', q: 'tea infusion set herbal', k: ['tea','infusion','herbal','teapot','tisane'], lo: 800, hi: 4000, p: ['Coffret Infusions', 'Théière en Fonte', 'Thé Vert Bio', 'Tisane du Soir', 'Boule à Thé'] },
        { c: 'Bien-être', q: 'self care bath wellness kit', k: ['bath','soap','candle','spa','wellness','care'], lo: 1500, hi: 8000, p: ['Coffret Bain', 'Savon Artisanal', 'Bougie de Massage', 'Sels de Bain', 'Masque Yeux Chauffant'] }
    ],
    cyber: [
        { c: 'Audio', q: 'headphones earbuds speaker', k: ['headphone','earbud','speaker','audio','sound'], lo: 2500, hi: 25000, p: ['Casque Circum-aural', 'Écouteurs True Wireless', 'Enceinte Portable', 'Barre de Son', 'Écouteurs Sport'] },
        { c: 'Accessoires PC', q: 'keyboard mouse pc accessories', k: ['keyboard','mouse','pc','accessory','hub'], lo: 1500, hi: 15000, p: ['Clavier Sans Fil', 'Souris Silencieuse', 'Hub USB-C', 'Tapis de Bureau', 'Support Écran'] },
        { c: 'Stockage', q: 'ssd usb drive storage', k: ['ssd','usb','drive','storage','disk','memory'], lo: 2000, hi: 18000, p: ['SSD Externe 1To', 'Clé USB 128Go', 'Carte microSD', 'Disque Dur 2To', 'Boîtier NVMe'] },
        { c: 'Chargeurs & Câbles', q: 'charger cable usb-c', k: ['charger','cable','usb','adapter','power'], lo: 500, hi: 5000, p: ['Chargeur GaN 65W', 'Câble USB-C Tressé', 'Batterie Externe 20000', 'Chargeur Sans Fil', 'Multiprise USB'] },
        { c: 'Objets Connectés', q: 'smartwatch smart home device', k: ['smartwatch','smart','device','tracker','sensor'], lo: 3000, hi: 30000, p: ['Montre Connectée', 'Bracelet d\'Activité', 'Ampoule Connectée', 'Prise Intelligente', 'Capteur Maison'] },
        { c: 'Écrans & Moniteurs', q: 'computer monitor screen', k: ['monitor','screen','display','led','4k'], lo: 15000, hi: 80000, p: ['Moniteur 27" QHD', 'Écran 24" IPS', 'Moniteur Incurvé 32"', 'Écran Portable', 'Moniteur 4K'] },
        { c: 'Smartphones & Accessoires', q: 'phone case accessories', k: ['phone','case','screen protector','holder','accessory'], lo: 1000, hi: 8000, p: ['Coque Antichoc', 'Verre Trempé', 'Support Voiture', 'Perche Bluetooth', 'Anneau Support'] },
        { c: 'Éclairage RGB', q: 'rgb led strip lighting setup', k: ['rgb','led','light','strip','lamp','lighting'], lo: 1500, hi: 9000, p: ['Ruban LED RGB', 'Panneaux Lumineux', 'Lampe de Bureau LED', 'Barre Lumineuse Écran', 'Néon USB'] }
    ],
    stationnery: [
        { c: 'Stylos & Écriture', q: 'fountain pen writing', k: ['pen','fountain','writing','ink','pencil'], lo: 300, hi: 6000, p: ['Stylo Plume', 'Roller Encre Gel', 'Set de Cartouches', 'Porte-mine', 'Stylo Bille Laiton'] },
        { c: 'Carnets & Agendas', q: 'notebook planner agenda', k: ['notebook','planner','journal','agenda','diary'], lo: 500, hi: 4000, p: ['Agenda Annuel', 'Carnet Pointillé', 'Bullet Journal', 'Cahier A5', 'Planner Hebdo'] },
        { c: 'Fournitures Bureau', q: 'office supplies desk organizer', k: ['office','desk','organizer','stapler','supplies'], lo: 400, hi: 3500, p: ['Organiseur de Bureau', 'Agrafeuse', 'Set Trombones', 'Pot à Crayons', 'Ruban Adhésif'] },
        { c: 'Art & Dessin', q: 'drawing art supplies sketchbook', k: ['art','drawing','sketch','paint','marker','pencil'], lo: 800, hi: 6000, p: ['Carnet de Croquis', 'Set Crayons Aquarelle', 'Marqueurs à Alcool', 'Feutres Fins', 'Bloc Papier Mixte'] },
        { c: 'Cartes & Papeterie Fine', q: 'greeting cards fine paper stationery', k: ['card','paper','envelope','stationery','letter'], lo: 200, hi: 2500, p: ['Cartes de Vœux', 'Papier à Lettres', 'Enveloppes Kraft', 'Set Correspondance', 'Étiquettes Cadeaux'] },
        { c: 'Livres Jeunesse', q: 'children books colorful', k: ['book','children','kids','story','illustrated'], lo: 500, hi: 3000, p: ['Album Illustré', 'Livre-Puzzle', 'Contes du Soir', 'Livre d\'Activités', 'Imagier'] },
        { c: 'Livres de Cuisine', q: 'cookbook recipe book', k: ['cookbook','recipe','cooking','food','kitchen'], lo: 1000, hi: 4000, p: ['Livre de Pâtisserie', 'Cuisine du Monde', 'Recettes Express', 'Cuisine Végétarienne', 'Guide des Épices'] },
        { c: 'Jeux & Puzzles', q: 'puzzle board game', k: ['puzzle','game','board','cards','jigsaw'], lo: 1000, hi: 6000, p: ['Puzzle 1000 Pièces', 'Jeu de Société', 'Jeu de Cartes', 'Casse-tête Bois', 'Puzzle 3D'] }
    ],
    food: [
        { c: 'Pâtisserie', q: 'french pastry cake dessert', k: ['pastry','cake','dessert','tart','patisserie'], lo: 300, hi: 2500, p: ['Éclair Café', 'Tarte au Citron', 'Fraisier', 'Paris-Brest', 'Millefeuille'] },
        { c: 'Viennoiserie', q: 'croissant viennoiserie bakery', k: ['croissant','pastry','bread','brioche','bun'], lo: 100, hi: 800, p: ['Croissant au Beurre', 'Pain au Chocolat', 'Chausson aux Pommes', 'Brioche Suisse', 'Pain aux Raisins'] },
        { c: 'Chocolats & Confiseries', q: 'chocolate candy sweets', k: ['chocolate','candy','sweet','praline','confectionery'], lo: 300, hi: 3000, p: ['Tablette Noir 70%', 'Assortiment Pralines', 'Truffes Cacao', 'Bonbons Caramel', 'Barre Noisettes'] },
        { c: 'Café & Thé', q: 'coffee beans tea packaging', k: ['coffee','tea','bean','roast','brew'], lo: 500, hi: 4000, p: ['Café en Grains Arabica', 'Café Moulu', 'Thé Noir Earl Grey', 'Thé Vert Menthe', 'Infusion Verveine'] },
        { c: 'Produits Laitiers', q: 'cheese dairy products', k: ['cheese','dairy','milk','yogurt','butter'], lo: 300, hi: 2500, p: ['Fromage Affiné', 'Beurre Fermier', 'Yaourt Nature', 'Crème Fraîche', 'Fromage Frais aux Herbes'] },
        { c: 'Confitures & Miel', q: 'jam honey jar', k: ['jam','honey','jar','preserve','marmalade'], lo: 400, hi: 2500, p: ['Confiture Abricot', 'Miel de Montagne', 'Confiture Figue', 'Pâte à Tartiner', 'Gelée de Coing'] },
        { c: 'Huiles & Condiments', q: 'olive oil condiments bottle', k: ['oil','olive','vinegar','sauce','condiment'], lo: 400, hi: 3000, p: ['Huile d\'Olive Extra', 'Vinaigre Balsamique', 'Moutarde à l\'Ancienne', 'Sauce Piquante', 'Huile de Sésame'] },
        { c: 'Boissons', q: 'juice beverages bottles', k: ['juice','drink','beverage','bottle','soda'], lo: 150, hi: 1500, p: ['Jus d\'Orange Pressé', 'Limonade Artisanale', 'Nectar Abricot', 'Thé Glacé', 'Eau Aromatisée'] }
    ],
    playful: [
        { c: 'Jeux Éducatifs', q: 'educational toys learning kids', k: ['toy','educational','learning','puzzle','game','kids'], lo: 1000, hi: 6000, p: ['Alphabet Magnétique', 'Jeu de Logique', 'Globe Interactif', 'Kit Sciences', 'Horloge d\'Apprentissage'] },
        { c: 'Peluches', q: 'plush stuffed animals toys', k: ['plush','teddy','stuffed','soft toy','bear'], lo: 800, hi: 5000, p: ['Ours en Peluche', 'Lapin Doudou', 'Peluche Dinosaure', 'Licorne XXL', 'Coussin Peluche'] },
        { c: 'Jeux de Plein Air', q: 'outdoor kids games play', k: ['outdoor','ball','play','kids','game','frisbee'], lo: 1500, hi: 9000, p: ['Trottinette 3 Roues', 'Ballon Sauteur', 'Cerf-Volant', 'Set Pétanque Enfant', 'Tunnel de Jeu'] },
        { c: 'Puzzles & Casse-têtes', q: 'puzzle kids jigsaw', k: ['puzzle','jigsaw','game','pieces','cube'], lo: 800, hi: 4000, p: ['Puzzle 100 Pièces', 'Puzzle en Bois', 'Cube Casse-tête', 'Puzzle Sol Géant', 'Tangram'] },
        { c: 'Chaussures Enfant', q: 'kids shoes sneakers', k: ['shoe','sneaker','kids','children','footwear'], lo: 1500, hi: 6000, p: ['Baskets Scratch', 'Sandales d\'Été', 'Bottes de Pluie', 'Chaussons Antidérapants', 'Baskets Lumineuses'] },
        { c: 'Accessoires Enfant', q: 'kids backpack hat accessories', k: ['backpack','hat','kids','bag','accessory','children'], lo: 800, hi: 4000, p: ['Sac à Dos Maternelle', 'Casquette Enfant', 'Gourde Isotherme', 'Trousse Scolaire', 'Parapluie Enfant'] },
        { c: 'Loisirs Créatifs', q: 'craft kit kids creative art', k: ['craft','art','creative','kit','paint','kids'], lo: 800, hi: 5000, p: ['Kit Pâte à Modeler', 'Perles à Repasser', 'Set Peinture Doigts', 'Ardoise Magique', 'Mosaïque Autocollante'] },
        { c: 'Livres & Éveil', q: 'baby books toddler learning', k: ['book','baby','toddler','story','learning'], lo: 500, hi: 3000, p: ['Livre Tissu Bébé', 'Livre Sonore', 'Imagier Premiers Mots', 'Livre à Rabats', 'Cherche et Trouve'] }
    ],
    activewear: [
        { c: 'Chaussures de Sport', q: 'running shoes sport', k: ['shoe','running','sneaker','sport','trainer'], lo: 4000, hi: 18000, p: ['Chaussures Running', 'Chaussures Training', 'Baskets Marche', 'Chaussures Trail', 'Sneakers Récup'] },
        { c: 'Yoga & Pilates', q: 'yoga mat equipment pilates', k: ['yoga','mat','pilates','block','stretch'], lo: 1500, hi: 9000, p: ['Tapis de Yoga', 'Brique de Yoga', 'Sangle d\'Étirement', 'Ballon Pilates', 'Roue de Yoga'] },
        { c: 'Musculation', q: 'dumbbells fitness equipment weights', k: ['dumbbell','weight','fitness','barbell','kettlebell','gym'], lo: 2000, hi: 20000, p: ['Haltères Réglables', 'Kettlebell 12kg', 'Barre de Traction', 'Élastiques de Force', 'Banc de Musculation'] },
        { c: 'Natation', q: 'swimwear goggles swimming', k: ['swim','goggles','swimwear','pool','cap'], lo: 1500, hi: 8000, p: ['Lunettes de Natation', 'Bonnet Silicone', 'Maillot Compétition', 'Planche de Natation', 'Sac Étanche'] },
        { c: 'Cyclisme', q: 'cycling gear helmet bike', k: ['cycling','bike','helmet','bicycle','cyclist'], lo: 3000, hi: 25000, p: ['Casque de Vélo', 'Cuissard Rembourré', 'Gants Cyclisme', 'Éclairage LED Vélo', 'Bidon Isotherme'] },
        { c: 'Randonnée', q: 'hiking backpack gear trekking', k: ['hiking','backpack','trekking','outdoor','trail','boot'], lo: 3000, hi: 20000, p: ['Sac à Dos 40L', 'Chaussures de Rando Montante', 'Bâtons Télescopiques', 'Veste Imperméable Softshell', 'Gourde Filtrante'] },
        { c: 'Nutrition Sportive', q: 'protein supplement sports nutrition', k: ['protein','supplement','nutrition','powder','shaker','energy'], lo: 2000, hi: 12000, p: ['Whey Protéine 1kg', 'Barres Protéinées', 'BCAA en Poudre', 'Shaker 700ml', 'Gel Énergétique'] },
        { c: 'Accessoires Fitness', q: 'resistance bands gym accessories', k: ['band','fitness','gym','accessory','strap','roller'], lo: 800, hi: 5000, p: ['Élastiques Résistance', 'Corde à Sauter', 'Rouleau Massage', 'Gants de Musculation', 'Ceinture de Force'] }
    ],
    chrono: [
        { c: 'Montres Automatiques', q: 'automatic luxury watch', k: ['watch','automatic','wristwatch','timepiece','mechanical'], lo: 40000, hi: 200000, p: ['Automatique Squelette', 'Automatique Plongée', 'Automatique GMT', 'Automatique Cuir', 'Automatique Or Rose'] },
        { c: 'Montres Connectées', q: 'premium smartwatch', k: ['smartwatch','watch','digital','connected','wearable'], lo: 15000, hi: 60000, p: ['Smartwatch Acier', 'Smartwatch Sport', 'Smartwatch Titane', 'Smartwatch Cuir', 'Smartwatch Céramique'] },
        { c: 'Bracelets de Montre', q: 'watch strap band leather', k: ['strap','band','watch','leather','bracelet'], lo: 3000, hi: 15000, p: ['Bracelet Cuir Cousu', 'Bracelet Milanais', 'Bracelet Acier', 'Bracelet Caoutchouc', 'Bracelet NATO'] },
        { c: 'Écrins & Remontoirs', q: 'watch box winder case', k: ['box','winder','case','watch','storage'], lo: 5000, hi: 40000, p: ['Écrin 6 Montres', 'Remontoir Automatique', 'Coffret Voyage', 'Écrin Cuir', 'Valise à Montres'] },
        { c: 'Stylos de Luxe', q: 'luxury fountain pen', k: ['pen','fountain','luxury','writing','nib'], lo: 8000, hi: 50000, p: ['Stylo Plume Or', 'Roller Laqué', 'Stylo Bille Résine', 'Parure Écriture', 'Stylo Édition Limitée'] },
        { c: 'Maroquinerie', q: 'luxury leather wallet briefcase', k: ['leather','wallet','briefcase','bag','maroquinerie'], lo: 6000, hi: 45000, p: ['Portefeuille Cuir Pleine Fleur', 'Porte-Cartes', 'Serviette Cuir', 'Ceinture Réversible Luxe', 'Trousse de Voyage'] },
        { c: 'Boutons de Manchette', q: 'luxury cufflinks', k: ['cufflink','cuff','link','accessory','silver'], lo: 4000, hi: 25000, p: ['Boutons Argent Massif', 'Boutons Onyx', 'Boutons Nacre', 'Boutons Émaillés', 'Coffret Boutons'] },
        { c: 'Lunettes Optiques', q: 'premium eyeglasses frames luxury', k: ['glasses','eyeglasses','frame','eyewear','optical'], lo: 8000, hi: 40000, p: ['Monture Titane', 'Monture Acétate', 'Monture Or', 'Monture Bois', 'Monture Édition Limitée'] }
    ],
    maison: [
        { c: 'Épices & Aromates', q: 'spices herbs gourmet jars', k: ['spice','herb','pepper','seasoning','gourmet'], lo: 400, hi: 3000, p: ['Poivre de Sichuan', 'Safran en Filaments', 'Mélange 4 Épices', 'Paprika Fumé', 'Fleur de Sel'] },
        { c: 'Chocolats Fins', q: 'fine chocolate truffle', k: ['chocolate','truffle','praline','cocoa','ganache'], lo: 800, hi: 6000, p: ['Tablette Grand Cru', 'Truffes Nature', 'Palets Or', 'Assortiment Ganaches', 'Écorces d\'Orange'] },
        { c: 'Thés & Cafés d\'Exception', q: 'premium tea coffee gourmet', k: ['tea','coffee','bean','leaf','brew','gourmet'], lo: 800, hi: 5000, p: ['Café de Spécialité', 'Thé Blanc Aiguilles', 'Thé Oolong', 'Café Micro-lot', 'Rooibos Vanille'] },
        { c: 'Confitures Artisanales', q: 'artisan jam preserves jar', k: ['jam','preserve','marmalade','fruit','jar'], lo: 500, hi: 3000, p: ['Confiture Figue-Noix', 'Marmelade d\'Agrumes', 'Confiture Lait', 'Gelée de Rose', 'Chutney Mangue'] },
        { c: 'Huiles & Vinaigres', q: 'gourmet olive oil vinegar', k: ['oil','vinegar','olive','balsamic','gourmet'], lo: 600, hi: 4000, p: ['Huile d\'Olive AOP', 'Vinaigre Balsamique 12 ans', 'Huile de Noix', 'Vinaigre de Cidre', 'Huile Truffe Blanche'] },
        { c: 'Fruits Confits & Dattes', q: 'dried dates candied fruit', k: ['date','dried','fruit','candied','fig','apricot'], lo: 500, hi: 3500, p: ['Dattes Medjool', 'Abricots Moelleux', 'Figues Séchées', 'Oranges Confites', 'Mélange Fruits & Noix'] },
        { c: 'Coffrets Gourmands', q: 'gourmet gift box hamper', k: ['gift','box','hamper','gourmet','basket','set'], lo: 3000, hi: 15000, p: ['Coffret Découverte', 'Panier Prestige', 'Box Apéritif', 'Coffret Petit-Déjeuner', 'Assortiment du Terroir'] },
        { c: 'Miels & Sirops', q: 'honey syrup jar artisan', k: ['honey','syrup','jar','nectar','maple'], lo: 500, hi: 3000, p: ['Miel de Lavande', 'Miel d\'Acacia', 'Sirop d\'Érable', 'Miel de Thym', 'Sirop d\'Agave'] }
    ],
    arena: [
        { c: 'Souris Gaming', q: 'gaming mouse rgb', k: ['mouse','gaming','rgb','wireless','dpi'], lo: 3000, hi: 18000, p: ['Souris Ultra-légère', 'Souris Sans Fil Pro', 'Souris MMO', 'Souris Ambidextre', 'Souris 8000 DPI'] },
        { c: 'Claviers Gaming', q: 'gaming mechanical keyboard rgb', k: ['keyboard','mechanical','gaming','switch','rgb'], lo: 4000, hi: 25000, p: ['Clavier 60%', 'Clavier TKL', 'Clavier Optique', 'Clavier Sans Fil', 'Clavier Hot-Swap'] },
        { c: 'Casques Gaming', q: 'gaming headset', k: ['headset','headphone','gaming','mic','surround'], lo: 3000, hi: 20000, p: ['Casque 7.1 Surround', 'Casque Sans Fil', 'Casque Léger', 'Casque à Réduction de Bruit', 'Casque Pro Esport'] },
        { c: 'Sièges Gaming', q: 'gaming chair', k: ['chair','gaming','seat','ergonomic','recliner'], lo: 20000, hi: 90000, p: ['Fauteuil Racing', 'Siège Ergonomique', 'Chaise Tissu Respirant', 'Siège Inclinable', 'Fauteuil XL'] },
        { c: 'Manettes', q: 'game controller gamepad', k: ['controller','gamepad','joystick','console','pad'], lo: 4000, hi: 20000, p: ['Manette Sans Fil', 'Manette Pro', 'Manette Arcade', 'Manette PC', 'Grip Manette'] },
        { c: 'Tapis de Souris', q: 'gaming mouse pad xxl desk', k: ['mouse pad','mousepad','desk mat','pad','gaming'], lo: 1000, hi: 6000, p: ['Grand Tapis de Bureau', 'Tapis Rigide Alu', 'Tapis RGB', 'Tapis Contrôle', 'Tapis Vitesse'] },
        { c: 'Streaming', q: 'streaming microphone webcam setup', k: ['microphone','webcam','stream','mic','camera','capture'], lo: 5000, hi: 40000, p: ['Micro USB Cardioïde', 'Webcam 1080p', 'Bras Articulé Micro', 'Carte de Capture', 'Panneau LED Streaming'] },
        { c: 'Écrans Gaming', q: 'gaming monitor 144hz', k: ['monitor','gaming','144hz','screen','display','hz'], lo: 25000, hi: 120000, p: ['Écran 24" 144Hz', 'Écran 27" 165Hz', 'Écran Incurvé 240Hz', 'Écran 4K 120Hz', 'Écran Ultra-Wide'] }
    ],
    nour: [
        { c: 'Robes & Kaftans', q: 'kaftan dress elegant modest', k: ['kaftan','dress','gown','robe','elegant','modest'], lo: 5000, hi: 30000, p: ['Kaftan Brodé', 'Robe Longue Fluide', 'Kaftan Perlé', 'Robe Chemise Maxi', 'Kaftan Deux Pièces'] },
        { c: 'Jilbabs', q: 'jilbab modest wear', k: ['jilbab','modest','abaya','cloak','prayer'], lo: 4000, hi: 20000, p: ['Jilbab Une Pièce', 'Jilbab Deux Pièces', 'Jilbab de Prière', 'Jilbab Plissé', 'Jilbab à Zip'] },
        { c: 'Châles & Étoles', q: 'shawl wrap scarf elegant', k: ['shawl','wrap','scarf','stole','pashmina'], lo: 1500, hi: 8000, p: ['Châle Pashmina', 'Étole Brodée', 'Châle à Franges', 'Étole Soie', 'Châle Maille Fine'] },
        { c: 'Sous-Hijabs & Bonnets', q: 'hijab underscarf cap', k: ['hijab','cap','underscarf','bonnet','headband'], lo: 500, hi: 2500, p: ['Bonnet Tube', 'Sous-Hijab Croisé', 'Bandeau Anti-glisse', 'Cagoule Jersey', 'Set 3 Bonnets'] },
        { c: 'Sacs & Pochettes', q: 'elegant handbag clutch', k: ['bag','handbag','clutch','purse','tote'], lo: 3000, hi: 18000, p: ['Sac à Main Structuré', 'Pochette de Soirée', 'Sac Bandoulière', 'Cabas Élégant', 'Mini Sac Chaîne'] },
        { c: 'Accessoires Hijab', q: 'hijab pins magnets accessories', k: ['pin','magnet','hijab','brooch','accessory','clip'], lo: 300, hi: 2000, p: ['Épingles à Nourrice', 'Aimants Hijab', 'Broche Strass', 'Clips Sans Trou', 'Coffret Épingles'] },
        { c: 'Abayas de Soirée', q: 'evening abaya embroidered elegant', k: ['abaya','evening','embroidered','gown','elegant','beaded'], lo: 8000, hi: 40000, p: ['Abaya Perlée Soirée', 'Abaya Cape', 'Abaya Sequins', 'Abaya Velours', 'Abaya Ceinturée Dorée'] },
        { c: 'Prêt-à-porter Modeste', q: 'modest tunic maxi skirt', k: ['tunic','skirt','modest','maxi','blouse','wide'], lo: 3000, hi: 15000, p: ['Tunique Longue', 'Jupe Maxi Plissée', 'Pantalon Large', 'Blouse Ample', 'Ensemble Tunique-Pantalon'] }
    ],
    embellir: [
        { c: 'Parfums', q: 'perfume eau de parfum bottle', k: ['perfume','fragrance','bottle','eau','scent'], lo: 4000, hi: 18000, p: ['Eau de Parfum Florale', 'Eau de Parfum Boisée', 'Brume Parfumée', 'Coffret Parfum', 'Roll-on Parfum'] },
        { c: 'Soin des Cheveux', q: 'hair care shampoo mask', k: ['hair','shampoo','conditioner','mask','serum'], lo: 800, hi: 6000, p: ['Shampooing Réparateur', 'Après-Shampooing', 'Masque Capillaire', 'Sérum Anti-frisottis', 'Huile Capillaire'] },
        { c: 'Soin du Corps', q: 'body lotion scrub care', k: ['body','lotion','scrub','cream','butter','care'], lo: 800, hi: 5000, p: ['Lait Corps Hydratant', 'Gommage Sucre', 'Beurre de Karité', 'Huile Sèche', 'Gel Douche Nourrissant'] },
        { c: 'Ongles & Manucure', q: 'nail polish manicure set', k: ['nail','polish','manicure','file','cuticle'], lo: 400, hi: 3000, p: ['Vernis Longue Tenue', 'Top Coat Brillant', 'Kit Manucure', 'Huile Cuticules', 'Dissolvant Sans Acétone'] },
        { c: 'Accessoires Beauté', q: 'makeup brushes beauty tools', k: ['brush','beauty','tool','sponge','mirror','applicator'], lo: 500, hi: 4000, p: ['Set Pinceaux', 'Éponge Blender', 'Miroir Lumineux', 'Recourbe-cils', 'Pochette Trousse'] },
        { c: 'Soin Solaire', q: 'sunscreen after sun care', k: ['sunscreen','spf','sun','after sun','tan','protection'], lo: 1000, hi: 5000, p: ['Crème Solaire SPF50', 'Brume Solaire', 'Après-Soleil Aloe', 'Stick Solaire Visage', 'Autobronzant Progressif'] },
        { c: 'Coffrets & Routines', q: 'skincare gift set routine', k: ['set','routine','gift','kit','skincare','coffret'], lo: 3000, hi: 15000, p: ['Routine Éclat', 'Coffret Hydratation', 'Set Découverte Soin', 'Rituel Nuit', 'Coffret Anti-âge'] },
        { c: 'Maquillage Yeux', q: 'eye makeup mascara palette', k: ['eye','mascara','eyeshadow','palette','liner','makeup'], lo: 800, hi: 5000, p: ['Palette 12 Teintes', 'Mascara Waterproof', 'Eyeliner Feutre', 'Crayon Khôl', 'Fards Nude'] }
    ]
}

async function searchPexels(query) {
    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '24')
    url.searchParams.set('orientation', 'square')
    const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } })
    if (!res.ok) throw new Error(`Pexels ${res.status}`)
    const data = await res.json()
    return (data.photos ?? []).map((p) => ({ url: p.src?.large || p.src?.original, alt: (p.alt || '').toLowerCase() }))
}
const coherent = (photo, terms) => terms.some((t) => photo.alt.includes(t))

async function pushImage(tenantId, sourceUrl, label) {
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const optimized = await sharp(buf).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    const key = `tenants/${tenantId}/public/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${label}.jpg`
    if (DRY) return `${BASE}/${BUCKET}/${key}`
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: optimized, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' }))
    return `${BASE}/${BUCKET}/${key}`
}

async function main() {
    let catCreated = 0, prodCreated = 0
    for (const [slug, cats] of Object.entries(EXTRA)) {
        if (ONLY.length && !ONLY.includes(slug)) continue
        const t = await prisma.tenant.findUnique({ where: { slug } })
        if (!t) { console.log(`skip ${slug} — tenant not found`); continue }
        console.log(`\n[${slug}]`)

        let gIndex = await prisma.product.count({ where: { tenantId: t.id } })

        for (const cat of cats) {
            const catSlug = slugify(cat.c, { lower: true, strict: true })
            const existing = await prisma.category.findFirst({ where: { tenantId: t.id, slug: catSlug } })
            if (existing) { console.log(`  = ${cat.c} — exists, skip`); continue }

            let photos = []
            try { photos = await searchPexels(cat.q) } catch (e) { console.log(`  ! pexels fail ${cat.c}: ${e.message}`) }
            const ranked = [...photos].sort((a, b) => Number(coherent(b, cat.k)) - Number(coherent(a, cat.k)))
            const pool = ranked.filter((p) => coherent(p, cat.k))
            const use = pool.length >= 4 ? pool : ranked
            if (!use.length) { console.log(`  ! no images for ${cat.c}, skipping category`); continue }

            const catImgUrl = await pushImage(t.id, use[0].url, `cat-${catSlug}`)
            let category
            if (DRY) { category = { id: 'dry' }; console.log(`  + [dry] category ${cat.c}`) }
            else {
                category = await prisma.category.create({ data: { tenantId: t.id, title: cat.c, slug: catSlug, imageUrl: catImgUrl } })
            }
            catCreated++

            for (let i = 0; i < cat.p.length; i++) {
                gIndex++
                const title = cat.p[i]
                const price = niceDZD(rnd(cat.lo, cat.hi))
                const stock = Math.floor(rnd(10, 90))
                const pSlug = `${slugify(title, { lower: true, strict: true })}-${gIndex}`
                const sku = `${slug}-${catSlug.slice(0, 4)}-${gIndex}`.toUpperCase().slice(0, 32)
                const imgs = [use[(i * 2) % use.length], use[(i * 2 + 1) % use.length]]
                const urls = []
                for (let j = 0; j < 2; j++) urls.push(await pushImage(t.id, imgs[j].url, `${catSlug}-${slugify(title, { lower: true, strict: true }).slice(0, 30)}-${j}`))

                if (DRY) { console.log(`    + [dry] ${title} — ${price} DZD`); prodCreated++; continue }
                const product = await prisma.product.create({ data: {
                    tenantId: t.id, title, slug: pSlug, price, stock, categoryId: category.id, isActive: true
                } })
                await prisma.productVariant.create({ data: {
                    tenantId: t.id, productId: product.id, sku, price, stock, trackInventory: true
                } })
                await prisma.productImage.createMany({ data: urls.map((url, k) => ({
                    tenantId: t.id, productId: product.id, url, position: k, isMain: k === 0
                })) })
                prodCreated++
            }
            console.log(`  + ${cat.c} — 5 products`)
        }
    }
    console.log(`\n${DRY ? '[dry-run] ' : ''}categories created: ${catCreated}, products created: ${prodCreated}`)
    await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
