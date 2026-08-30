// Builds a REVIEWED image manifest for the theme demo stores + the wellness store,
// so the production seed (scripts/seed-prod-stores.mjs) has a frozen, human-checked
// list of image URLs to download and push to prod S3 — no live provider calls at seed time.
//
// Pass 1 (this script): one Pexels search per theme category and per wellness product,
// keyword-coherence filter, write scripts/store-image-manifest.json + a review report.
// Resumable: cached raw search results in scripts/.image-search-cache.json are reused.
// Pexels free tier is 200 req/hour, so all ~48 searches run in one pass.
//
// Usage: PEXELS_API_KEY=xxx node scripts/build-store-image-manifest.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs'
import slugify from 'slugify'

const API_KEY = process.env.PEXELS_API_KEY
if (!API_KEY) { console.error('Missing PEXELS_API_KEY'); process.exit(1) }

const CACHE_PATH = 'scripts/.image-search-cache.json'
const MANIFEST_PATH = 'scripts/store-image-manifest.json'
const REPORT_PATH = 'scripts/store-image-manifest.review.txt'

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {}

// ---- theme categories: exact product order matches scripts/seed-theme-demo-stores.mjs ----
const THEME_CATEGORIES = [
    { theme: 'classic', category: 'Vêtements', query: 'shirt trousers clothing flatlay', checkTerms: ['shirt','dress','jacket','sweater','coat','skirt','cardigan','t-shirt','pants','trouser','clothing','fashion','blazer'], products: ['Chemise Oxford','Pantalon Chino','Robe Trapèze','Veste Blazer','Pull Col Rond','Manteau Laine','Jupe Plissée','Cardigan Torsadé','T-shirt Basique','Pantalon Costume'] },
    { theme: 'classic', category: 'Bijoux', query: 'jewelry accessories', checkTerms: ['necklace','bracelet','ring','earring','brooch','pendant','jewelry','jewellery','gold','pearl'], products: ["Collier Perles",'Bracelet Or','Bague Solitaire',"Boucles d'Oreilles Créoles",'Broche Vintage','Pendentif Cœur','Bracelet Chaîne','Collier Ras de Cou','Bague Torsadée','Boucles Perle'] },
    { theme: 'modern', category: 'Mode', query: 'dress on hanger boutique clothing rack', checkTerms: ['dress','skirt','top','pants','blazer','coat','blouse','fashion','outfit','suit','hanger','garment'], products: ['Robe Asymétrique','Combinaison Tailleur','Jupe Midi','Top Croisé','Pantalon Palazzo','Veste Structurée','Robe Portefeuille','Blouse Satin','Trench Coat','Ensemble Deux Pièces'] },
    { theme: 'modern', category: 'Beauté', query: 'beauty cosmetics skincare product', checkTerms: ['serum','cream','makeup','cosmetic','lipstick','perfume','skincare','beauty','powder','mask'], products: ['Sérum Éclat','Crème Hydratante','Fond de Teint','Palette Fards','Rouge à Lèvres Mat','Huile Démaquillante','Masque Argile','Eau de Parfum','Baume Lèvres','Poudre Compacte'] },
    { theme: 'street', category: 'Sneakers', query: 'sneakers shoes', checkTerms: ['sneaker','shoe','trainer','footwear'], products: ['Sneakers Basses','Sneakers Montantes','Baskets Running','Baskets Rétro','Sneakers Chunky','Baskets Toile','Sneakers Cuir','Baskets Slip-On','Sneakers Édition Limitée','Baskets Plateforme'] },
    { theme: 'street', category: 'Streetwear', query: 'streetwear hoodie clothing', checkTerms: ['hoodie','sweatshirt','jacket','cap','streetwear','pants','bag','cargo','beanie'], products: ['Hoodie Oversize','Sweat Graphique','Cargo Pants','Casquette Snapback','Veste Bomber','T-shirt Print','Jogger Technique','Bonnet Brodé','Sac Banane','Coupe-Vent'] },
    { theme: 'cozy', category: 'Bougies', query: 'scented candle', checkTerms: ['candle','wax','wick'], products: ['Bougie Vanille','Bougie Santal','Bougie Lavande','Bougie Cannelle','Bougie Bois de Cèdre','Bougie Fleur de Coton','Bougie Ambre','Bougie Citron Vert','Bougie Musc Blanc','Bougie Pin Sylvestre'] },
    { theme: 'cozy', category: 'Cadeaux', query: 'gift box basket cozy', checkTerms: ['gift','box','basket','mug','blanket','notebook','tea','soap','diffuser','cozy'], products: ['Coffret Bien-être','Panier Gourmand','Set Tasses Céramique','Plaid Douillet','Carnet Relié','Coffret Infusions','Bougie et Savon Duo','Trousse Cadeau','Diffuseur Huiles','Coffret Découverte'] },
    { theme: 'cyber', category: 'Électronique', query: 'computer mouse keyboard headphones', checkTerms: ['headphone','speaker','charger','mouse','keyboard','webcam','ssd','drive','cable','laptop','electronic'], products: ['Casque Sans Fil','Enceinte Bluetooth','Chargeur Rapide','Souris Ergonomique','Clavier Mécanique','Webcam HD','Disque SSD Externe','Powerbank','Câble USB-C','Support Ordinateur'] },
    { theme: 'cyber', category: 'Gaming', query: 'gaming controller keyboard headset', checkTerms: ['controller','headset','mouse','chair','microphone','graphics card','gpu','wheel','monitor','keyboard','gaming'], products: ['Manette Sans Fil','Casque Gaming RGB','Tapis de Souris XXL','Chaise Gaming','Micro Streaming','Carte Graphique','Volant Course','Écran Gaming 144Hz','Clavier Mécanique RGB','Support Manettes'] },
    { theme: 'stationnery', category: 'Papeterie', query: 'stationery office supplies', checkTerms: ['notebook','pen','marker','planner','notepad','pencil','highlighter','paper','envelope','stamp','stationery'], products: ['Carnet Ligné','Stylo Plume','Set Marqueurs','Agenda Annuel','Bloc-notes Kraft','Trousse Cuir','Surligneurs Pastel','Papier Origami','Enveloppes Kraft','Tampon Personnalisé'] },
    { theme: 'stationnery', category: 'Livres', query: 'books reading', checkTerms: ['book','novel','comic','journal','cookbook','reading'], products: ['Roman Best-seller','Guide Pratique','Bande Dessinée','Carnet de Voyage','Livre Cuisine','Roman Policier','Essai Contemporain','Livre Jeunesse','Beau Livre Photo','Recueil Poésie'] },
    { theme: 'food', category: 'Boulangerie', query: 'bakery bread pastry', checkTerms: ['bread','croissant','baguette','brioche','tart','eclair','cookie','cake','muffin','bakery','pastry'], products: ['Pain Complet','Croissant Beurre','Baguette Tradition','Brioche Nature','Tarte aux Pommes','Éclair Chocolat','Cookie Pépites','Fougasse Olives','Gâteau Marbré','Muffin Myrtille'] },
    { theme: 'food', category: 'Épicerie', query: 'grocery food products olive oil pasta', checkTerms: ['oil','honey','pasta','jam','spice','coffee','tea','rice','sauce','vinegar','grocery','jar','bottle','pantry','food'], products: ["Huile d'Olive",'Miel Naturel','Pâtes Artisanales','Confiture Maison','Épices Assorties','Café en Grains','Thé Vert Bio','Riz Basmati','Sauce Tomate','Vinaigre Balsamique'] },
    { theme: 'playful', category: 'Jouets', query: 'colorful toys wooden blocks', checkTerms: ['teddy','bear','puzzle','car','toy','board game','block','doll','robot','scooter','cards','wooden','play'], products: ['Peluche Ourson','Puzzle 500 Pièces','Voiture Télécommandée','Jeu de Société','Blocs de Construction','Poupée Articulée','Kit Pâte à Modeler','Trottinette Enfant','Jeu de Cartes','Robot Éducatif'] },
    { theme: 'playful', category: 'Mode enfant', query: 'kids clothes flatlay outfit', checkTerms: ['kid','child','children','baby','toddler','pajama','dress','shirt','overalls','hoodie','shoe','hat','legging','coat','clothes','outfit'], products: ['Pyjama Imprimé','Robe Fillette','T-shirt Dinosaure','Salopette Denim','Sweat à Capuche Enfant','Ensemble Deux Pièces Enfant','Chaussons Souples','Bonnet Enfant','Legging Coloré','Manteau Enfant'] },
    { theme: 'activewear', category: 'Sport', query: 'gym workout clothes activewear', checkTerms: ['legging','shirt','shorts','bra','jacket','tank','jogger','hoodie','sport','fitness','athletic'], products: ['Legging Sport','T-shirt Technique','Short de Running','Brassière Sport','Veste Coupe-Vent','Débardeur Fitness','Jogging Molleton','Sweat Zippé','Short Training','Legging Taille Haute'] },
    { theme: 'activewear', category: 'Plein air', query: 'camping tent backpack outdoor', checkTerms: ['backpack','bottle','tent','sleeping bag','pole','jacket','headlamp','shoe','mat','compass','hiking','outdoor'], products: ['Sac à Dos Randonnée','Gourde Isotherme','Tente Légère','Sac de Couchage','Bâtons de Randonnée','Veste Imperméable','Lampe Frontale','Chaussures de Trail','Tapis de Camping','Boussole'] },
    { theme: 'chrono', category: 'Montres', query: 'luxury wristwatch', checkTerms: ['watch','wristwatch','clock','timepiece'], products: ['Montre Chronographe','Montre Automatique','Montre Squelette','Montre Minimaliste','Montre Plongée','Montre Connectée','Montre Vintage','Montre Bracelet Cuir','Montre Acier','Montre Édition Limitée'] },
    { theme: 'chrono', category: 'Lunettes de soleil', query: 'sunglasses', checkTerms: ['sunglasses','glasses','eyewear'], products: ['Lunettes Aviateur','Lunettes Rondes','Lunettes Cat-Eye','Lunettes Polarisées','Lunettes Rectangulaires','Lunettes Oversize','Lunettes Écaille','Lunettes Miroir','Lunettes Sport','Lunettes Vintage'] },
    { theme: 'maison', category: 'Épicerie fine', query: 'gourmet delicatessen food products', checkTerms: ['oil','honey','jam','chocolate','vinegar','pate','olive','salt','gift','gourmet','jar'], products: ['Huile Truffe','Miel de Lavande',"Confit d'Oignons",'Chocolat Grand Cru',"Caviar d'Aubergine",'Vinaigre Balsamique Vieilli','Pâté de Campagne','Tapenade Olives','Sel de Guérande','Coffret Dégustation'] },
    { theme: 'maison', category: 'Fruits secs', query: 'nuts bowl almonds cashews', checkTerms: ['pistachio','almond','cashew','nut','hazelnut','date','fig','apricot','peanut','pine nut','dried fruit','bowl','seeds'], products: ['Pistaches Grillées','Amandes Fumées','Noix de Cajou','Mélange Fruits Secs','Noisettes Torréfiées','Dattes Deglet Nour','Figues Séchées','Abricots Secs','Cacahuètes Enrobées','Pignons de Pin'] },
    { theme: 'arena', category: 'Périphériques gaming', query: 'gaming peripherals mouse keyboard', checkTerms: ['mouse','keyboard','mouse pad','headset','controller','hub','cable','stand','gaming'], products: ['Souris Gaming RGB','Clavier Mécanique Gaming','Tapis de Souris Gaming','Casque Gaming 7.1','Manette Pro Gaming','Support Casque','Hub USB Gaming','Repose-poignet Gaming','Câble Gaming Tressé','Stand Manette'] },
    { theme: 'arena', category: 'Accessoires esport', query: 'gaming room desk setup rgb', checkTerms: ['jersey','chair','microphone','webcam','light','desk','glasses','capture card','mat','esport','streaming','gaming','rgb','monitor','setup'], products: ['Maillot Esport','Chaise Gaming Pro','Micro Streaming Pro','Webcam Streaming','Éclairage RGB Setup','Bureau Gaming','Filtre Anti-lumière','Carte Capture Vidéo','Bras Support Micro','Tapis Bureau XXL'] },
    { theme: 'nour', category: 'Abayas', query: 'abaya modest fashion dress', checkTerms: ['abaya','kaftan','kimono','gown','robe','dress','hijab','headscarf','modest','fashion','cloak'], products: ['Abaya Noire Classique','Abaya Brodée','Abaya Kimono','Abaya Dubaï','Abaya Perlée','Abaya Évasée','Abaya Satin','Abaya Denim','Abaya Fermeture Zip','Abaya Ceinturée'] },
    { theme: 'nour', category: 'Hijabs', query: 'hijab muslim woman portrait', checkTerms: ['hijab','scarf','headscarf','muslim','veil','islamic'], products: ['Hijab Jersey','Hijab Mousseline','Hijab Soie','Hijab Instantané','Hijab Brodé','Hijab Coton','Hijab Chiffon','Hijab Pashmina','Hijab Uni','Hijab Imprimé'] },
    { theme: 'embellir', category: 'Soins visage', query: 'facial skincare product', checkTerms: ['serum','cream','cleanser','mask','water','oil','toner','skincare','face'], products: ['Sérum Vitamine C','Crème Anti-Âge','Nettoyant Doux','Contour des Yeux','Masque Hydratant','Eau Micellaire','Exfoliant Doux','Huile Visage','Tonique Floral','Crème de Nuit'] },
    { theme: 'embellir', category: 'Cosmétiques', query: 'makeup products flatlay cosmetics', checkTerms: ['lipstick','eyeshadow','foundation','mascara','blush','highlighter','eyebrow','nail polish','eyeliner','concealer','makeup','cosmetic','palette','beauty'], products: ['Rouge à Lèvres Velours','Palette Yeux','Fond de Teint Fluide','Mascara Volume','Blush Poudre','Enlumineur','Crayon Sourcils','Vernis à Ongles','Eyeliner Précision','Anticernes'] }
]

// ---- wellness: per-product search (products are specific), from scripts/wellness-store.json ----
const WELLNESS = [
    { title: 'Sérum Vitamine C Éclat 30ml', query: 'vitamin c serum skincare bottle', checkTerms: ['serum','bottle','dropper','skincare','vitamin'] },
    { title: 'Crème Hydratante Acide Hyaluronique 50ml', query: 'moisturizer face cream jar', checkTerms: ['cream','moisturizer','jar','skincare','lotion'] },
    { title: 'Fluide Solaire SPF50+ Visage', query: 'sunscreen', checkTerms: ['sunscreen','spf','sunblock','lotion','bottle','tube','sun cream'] },
    { title: 'Eau Micellaire Peaux Sensibles 400ml', query: 'micellar water cleanser bottle', checkTerms: ['micellar','water','cleanser','bottle','toner','skincare'] },
    { title: 'Crème Nuit Anti-Âge Régénérante 50ml', query: 'night cream anti aging jar skincare', checkTerms: ['cream','jar','night','anti','aging','skincare','moisturizer'] },
    { title: 'Crème Change Bébé Apaisante', query: 'baby diaper rash cream tube', checkTerms: ['baby','diaper','cream','tube','balm','infant'] },
    { title: 'Vitamines Prénatales 90 Gélules', query: 'vitamin supplement bottle', checkTerms: ['vitamin','supplement','pill','capsule','bottle','tablet'] },
    { title: 'Oméga-3 Huile de Poisson 120 Capsules', query: 'fish oil omega 3 capsules supplement', checkTerms: ['fish oil','omega','capsule','supplement','softgel','pill','bottle'] },
    { title: 'Thermomètre Digital Frontal', query: 'thermometer fever', checkTerms: ['thermometer','temperature','medical','digital','fever'] },
    { title: 'Tensiomètre Bras Automatique', query: 'blood pressure monitor arm device', checkTerms: ['blood pressure','monitor','cuff','sphygmomanometer','medical','device'] },
    { title: 'Chaussettes de Contention Classe 2', query: 'compression socks legs', checkTerms: ['compression','sock','stocking','legs','hosiery'] },
    { title: 'Baume à Lèvres Réparateur', query: 'lip balm', checkTerms: ['lip balm','lip','balm','chapstick','tube','lipstick'] },
    { title: 'Shampoing Antipelliculaire 250ml', query: 'shampoo bottle hair care', checkTerms: ['shampoo','bottle','hair','conditioner'] },
    { title: 'Sérum Fortifiant Anti-Chute Cheveux', query: 'hair growth serum bottle treatment', checkTerms: ['hair','serum','bottle','scalp','treatment','dropper'] },
    { title: 'Gel Hydroalcoolique Désinfectant', query: 'hand sanitizer gel bottle', checkTerms: ['sanitizer','hand','gel','disinfectant','bottle','antibacterial'] },
    { title: 'Boisson Isotonique Électrolytes', query: 'electrolyte drink powder sports', checkTerms: ['electrolyte','drink','sports','powder','hydration','bottle'] },
    { title: 'Gel Anti-Imperfections Ciblé', query: 'acne spot treatment gel skincare', checkTerms: ['acne','blemish','spot','treatment','gel','skincare','serum'] },
    { title: 'Masques Chirurgicaux Type II (Boîte de 50)', query: 'surgical mask', checkTerms: ['mask','surgical','face mask','medical','ppe'] },
    { title: 'Boisson Collagène Beauté 10 Sticks', query: 'collagen supplement powder sachet', checkTerms: ['collagen','supplement','powder','sachet','stick','beauty','drink'] },
    { title: 'Rouleau de Bandage Élastique', query: 'bandage first aid', checkTerms: ['bandage','elastic','gauze','wrap','first aid','medical','dressing'] }
]

// Wide hero image for each theme's homepage carousel (3 slides per store).
const THEME_HEROES = {
    classic: 'elegant fashion boutique clothing',
    modern: 'modern fashion studio minimal',
    street: 'urban streetwear style city',
    cozy: 'cozy home candles warm interior',
    cyber: 'futuristic technology neon workspace',
    stationnery: 'bookshop library reading desk',
    food: 'artisan bakery fresh food display',
    playful: 'colorful kids toys playroom',
    activewear: 'fitness running outdoor athletic',
    chrono: 'luxury watch elegant dark',
    maison: 'gourmet food delicatessen table',
    arena: 'esports gaming arena rgb setup',
    nour: 'elegant modest fashion abaya',
    embellir: 'beauty skincare spa cosmetics'
}

async function search(query, orientation = 'square') {
    const ck = orientation === 'square' ? query : `${query}::${orientation}`
    if (cache[ck]) return cache[ck]
    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '30')
    url.searchParams.set('orientation', orientation)
    const res = await fetch(url, { headers: { Authorization: API_KEY } })
    if (res.status === 429) throw new Error('RATE_LIMIT')
    if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    const slim = (data.photos ?? []).map((p) => ({
        id: String(p.id),
        url: orientation === 'square'
            ? (p.src?.large || p.src?.large2x || p.src?.original)
            : (p.src?.large2x || p.src?.landscape || p.src?.original),
        alt: p.alt || '',
        tags: []
    }))
    cache[ck] = slim
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0))
    return slim
}

const coherent = (photo, terms) => {
    const text = [photo.alt, ...(photo.tags || [])].join(' ').toLowerCase()
    return terms.some((t) => text.includes(t))
}

async function main() {
    const manifest = { generatedAt: new Date().toISOString(), themeStores: {}, themeHeroes: {}, wellness: {} }
    const report = []
    let rateLimited = false

    for (const [themeKey, heroQuery] of Object.entries(THEME_HEROES)) {
        if (rateLimited) break
        let results
        try {
            results = await search(heroQuery, 'landscape')
        } catch (e) {
            if (e.message === 'RATE_LIMIT') { rateLimited = true; console.log(`RATE LIMITED at hero/${themeKey}`); break }
            throw e
        }
        manifest.themeHeroes[themeKey] = results.slice(0, 3).map((p) => ({ url: p.url, alt: p.alt }))
        console.log(`ok  hero/${themeKey} — ${results.length} results`)
    }

    for (const group of THEME_CATEGORIES) {
        if (rateLimited) break
        let results
        try {
            results = await search(group.query)
        } catch (e) {
            if (e.message === 'RATE_LIMIT') { rateLimited = true; console.log(`RATE LIMITED at ${group.theme}/${group.category} — rerun in ~1h`); break }
            throw e
        }
        const ranked = [...results].sort((a, b) => Number(coherent(b, group.checkTerms)) - Number(coherent(a, group.checkTerms)))
        // Assign only from the keyword-coherent subset when it's big enough; images may
        // repeat across products, but a repeat beats an off-topic photo. Fall back to the
        // full result set only when too few coherent matches exist.
        const cohPool = ranked.filter((p) => coherent(p, group.checkTerms))
        const pool = cohPool.length >= 6 ? cohPool : ranked
        const slot = manifest.themeStores[group.theme] ??= {}
        const catSlug = slugify(group.category, { lower: true, strict: true })
        const entries = group.products.map((title, i) => {
            const p1 = pool[(i * 2) % pool.length]
            const p2 = pool[(i * 2 + 1) % pool.length]
            return {
                product: title,
                images: [p1, p2].map((p) => ({ url: p.url, alt: p.alt, ok: coherent(p, group.checkTerms) }))
            }
        })
        slot[catSlug] = { category: group.category, categoryImage: pool[0]?.url, products: entries }
        const flagged = entries.flatMap((e) => e.images.filter((im) => !im.ok).map((im) => `    FLAG ${group.theme}/${group.category} · ${e.product} · "${im.alt}" · ${im.url}`))
        report.push(`${group.theme}/${group.category}: ${results.length} results, ${flagged.length} flagged`)
        report.push(...flagged)
        console.log(`ok  ${group.theme}/${group.category} — ${results.length} results, ${flagged.length} flagged`)
    }

    for (const w of WELLNESS) {
        if (rateLimited) break
        let results
        try {
            results = await search(w.query)
        } catch (e) {
            if (e.message === 'RATE_LIMIT') { rateLimited = true; console.log(`RATE LIMITED at wellness/${w.title} — rerun in ~1h`); break }
            throw e
        }
        const ranked = [...results].sort((a, b) => Number(coherent(b, w.checkTerms)) - Number(coherent(a, w.checkTerms)))
        const cohPool = ranked.filter((p) => coherent(p, w.checkTerms))
        const wp = cohPool.length >= 2 ? cohPool : ranked
        const p1 = wp[0], p2 = wp[1] || wp[0]
        manifest.wellness[w.title] = { images: [p1, p2].map((p) => ({ url: p?.url, alt: p?.alt, ok: p ? coherent(p, w.checkTerms) : false })) }
        const flagged = manifest.wellness[w.title].images.filter((im) => !im.ok).map((im) => `    FLAG wellness · ${w.title} · "${im.alt}" · ${im.url}`)
        report.push(`wellness/${w.title}: ${results.length} results, ${flagged.length} flagged`)
        report.push(...flagged)
        console.log(`ok  wellness/${w.title} — ${results.length} results, ${flagged.length} flagged`)
    }

    manifest.complete = !rateLimited
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    writeFileSync(REPORT_PATH, report.join('\n') + '\n')
    console.log(`\n${rateLimited ? 'PARTIAL' : 'COMPLETE'} — wrote ${MANIFEST_PATH} and ${REPORT_PATH}`)
}

main()
