/**
 * seed-test-store.ts
 * Creates a "test" tenant with admin@test.com / password,
 * 10 categories, 100 products (10 per category), variants (Color + Size),
 * and downloads/stores product images via ProductImage model.
 *
 * Run: npx tsx scripts/seed-test-store.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ─── Config ──────────────────────────────────────────────────────────────────
const TENANT_SLUG = 'test';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'password';

// Where to save downloaded images (relative to project root)
const IMAGES_DIR = path.resolve(process.cwd(), 'public', 'seed-images');

// ─── Image helpers ────────────────────────────────────────────────────────────

/** Download a URL to disk; returns the local path (or the original URL on failure) */
async function downloadImage(url: string, destPath: string): Promise<string> {
    return new Promise((resolve) => {
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlink(destPath, () => { });
                downloadImage(res.headers.location!, destPath).then(resolve);
                return;
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(destPath);
            });
        });
        req.on('error', () => {
            file.close();
            fs.unlink(destPath, () => { });
            resolve(url); // fall back to remote URL
        });
        req.setTimeout(15000, () => { req.destroy(); resolve(url); });
    });
}

// Unsplash sources by category key
const CATEGORY_IMAGES: Record<string, string[]> = {
    clothing: [
        'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80',
        'https://images.unsplash.com/photo-1467043237213-65f2da53396f?w=800&q=80',
        'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
    ],
    shoes: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80',
        'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80',
    ],
    electronics: [
        'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    ],
    phones: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&q=80',
    ],
    bags: [
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80',
        'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80',
    ],
    watches: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
        'https://images.unsplash.com/photo-1611232658409-0d98127f237f?w=800&q=80',
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80',
    ],
    perfumes: [
        'https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80',
        'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&q=80',
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80',
    ],
    sports: [
        'https://images.unsplash.com/photo-1543168256-418811576931?w=800&q=80',
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
    ],
    furniture: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
        'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80',
    ],
    books: [
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
    ],
};

// ─── Catalogue ────────────────────────────────────────────────────────────────

type ProductDef = { title: string; price: number; cost: number; description: string };
type CategoryDef = { name: string; slug: string; products: ProductDef[] };

const CATALOGUE: CategoryDef[] = [
    {
        name: 'Clothing', slug: 'clothing',
        products: [
            { title: 'Classic White T-Shirt', price: 1990, cost: 800, description: 'Essential everyday tee in premium cotton.' },
            { title: 'Slim-Fit Jeans', price: 4990, cost: 2000, description: 'Modern slim-fit denim for a sharp look.' },
            { title: 'Hooded Sweatshirt', price: 3490, cost: 1400, description: 'Cozy fleece hoodie for chilly evenings.' },
            { title: 'Linen Shirt', price: 2990, cost: 1200, description: 'Breathable linen perfect for summer.' },
            { title: 'Chino Pants', price: 3990, cost: 1600, description: 'Versatile chinos for work or weekend.' },
            { title: 'Wool Blazer', price: 8990, cost: 3500, description: 'Tailored wool blend blazer.' },
            { title: 'Polo Shirt', price: 2490, cost: 1000, description: 'Classic piqué polo in vibrant colors.' },
            { title: 'Cargo Shorts', price: 2990, cost: 1200, description: 'Practical cargo shorts with multiple pockets.' },
            { title: 'Floral Dress', price: 3990, cost: 1600, description: 'Light floral midi dress for spring.' },
            { title: 'Denim Jacket', price: 5990, cost: 2400, description: 'Iconic denim jacket, timeless style.' },
        ],
    },
    {
        name: 'Shoes', slug: 'shoes',
        products: [
            { title: 'White Sneakers', price: 5990, cost: 2400, description: 'Clean minimal white leather sneakers.' },
            { title: 'Running Shoes', price: 7990, cost: 3200, description: 'Lightweight shoes built for performance.' },
            { title: 'Chelsea Boots', price: 9990, cost: 4000, description: 'Sleek ankle boots for any occasion.' },
            { title: 'Loafers', price: 6990, cost: 2800, description: 'Slip-on loafers in supple leather.' },
            { title: 'Hiking Boots', price: 11990, cost: 4800, description: 'Durable waterproof hiking boots.' },
            { title: 'Sandals', price: 2990, cost: 1200, description: 'Summer sandals with adjustable straps.' },
            { title: 'Oxford Shoes', price: 8990, cost: 3600, description: 'Classic Oxford brogues for formal wear.' },
            { title: 'Platform Sneakers', price: 6490, cost: 2600, description: 'Chunky platform sole sneakers.' },
            { title: 'Slip-On Mules', price: 3990, cost: 1600, description: 'Easy slip-on mules for everyday comfort.' },
            { title: 'Ankle Strap Heels', price: 7490, cost: 3000, description: 'Elegant block-heel sandals with ankle strap.' },
        ],
    },
    {
        name: 'Electronics', slug: 'electronics',
        products: [
            { title: 'Wireless Earbuds', price: 8990, cost: 3600, description: 'True wireless earbuds with ANC.' },
            { title: 'Portable Speaker', price: 12990, cost: 5200, description: '360° sound, waterproof Bluetooth speaker.' },
            { title: 'USB-C Hub', price: 4490, cost: 1800, description: '7-in-1 USB-C hub for laptops.' },
            { title: 'Mechanical Keyboard', price: 15990, cost: 6400, description: 'TKL mechanical keyboard with RGB lighting.' },
            { title: 'Gaming Mouse', price: 6990, cost: 2800, description: 'Ergonomic gaming mouse with 12 programmable buttons.' },
            { title: 'Monitor Stand', price: 3990, cost: 1600, description: 'Adjustable monitor riser with storage.' },
            { title: 'Webcam HD', price: 7490, cost: 3000, description: '1080p webcam with noise-cancelling mic.' },
            { title: 'LED Desk Lamp', price: 2990, cost: 1200, description: 'Dimmable LED lamp with USB charging port.' },
            { title: 'Power Bank 20000mAh', price: 5990, cost: 2400, description: 'High-capacity fast-charging power bank.' },
            { title: 'Smart Plug', price: 1990, cost: 800, description: 'Wi-Fi smart plug with energy monitoring.' },
        ],
    },
    {
        name: 'Phones', slug: 'phones',
        products: [
            { title: 'ProMax X1', price: 129900, cost: 90000, description: 'Flagship phone with 200MP camera system.' },
            { title: 'ProMax X1 Lite', price: 89900, cost: 62000, description: 'Lighter variant with all-day battery.' },
            { title: 'Alpha Z9', price: 69900, cost: 48000, description: 'Premium AMOLED display, 5G ready.' },
            { title: 'Alpha Z8', price: 49900, cost: 34000, description: 'Smooth 120Hz screen, powerful chip.' },
            { title: 'BudgetPlus 5G', price: 29900, cost: 18000, description: 'Affordable 5G with good cameras.' },
            { title: 'MiniPhone SE', price: 39900, cost: 26000, description: 'Compact form factor, flagship internals.' },
            { title: 'FoldPro', price: 199900, cost: 140000, description: 'Foldable screen with S-pen support.' },
            { title: 'TabPhone Ultra', price: 149900, cost: 100000, description: 'Large display tablet/phone hybrid.' },
            { title: 'RuGged Pro', price: 59900, cost: 40000, description: 'Military-grade rugged phone, IP68.' },
            { title: 'GamingPhone GTX', price: 99900, cost: 68000, description: 'Gaming phone with 165Hz display and cooling fan.' },
        ],
    },
    {
        name: 'Bags', slug: 'bags',
        products: [
            { title: 'Leather Backpack', price: 14990, cost: 6000, description: 'Genuine leather backpack with laptop compartment.' },
            { title: 'Canvas Tote', price: 3990, cost: 1600, description: 'Eco-friendly heavy canvas tote bag.' },
            { title: 'Crossbody Bag', price: 8990, cost: 3600, description: 'Compact versatile crossbody with multiple pockets.' },
            { title: 'Duffel Bag', price: 11990, cost: 4800, description: 'Spacious weekend duffel bag.' },
            { title: 'Laptop Messenger', price: 9990, cost: 4000, description: 'Padded messenger bag for 15" laptops.' },
            { title: 'Clutch Bag', price: 4990, cost: 2000, description: 'Elegant evening clutch.' },
            { title: 'Waist Pack', price: 2990, cost: 1200, description: 'Hands-free fanny pack for travel.' },
            { title: 'Gym Bag', price: 5990, cost: 2400, description: 'Large gym bag with shoe compartment.' },
            { title: 'Briefcase', price: 17990, cost: 7200, description: 'Professional leather briefcase.' },
            { title: 'Mini Backpack', price: 6990, cost: 2800, description: 'Trendy mini backpack for daily essentials.' },
        ],
    },
    {
        name: 'Watches', slug: 'watches',
        products: [
            { title: 'Chronograph Classic', price: 29900, cost: 12000, description: 'Swiss-inspired chronograph with sapphire glass.' },
            { title: 'Smart Watch Pro', price: 24900, cost: 10000, description: 'Health tracking smartwatch, 7-day battery.' },
            { title: 'Minimalist Diver', price: 19900, cost: 8000, description: '200m water-resistant minimalist diver watch.' },
            { title: 'Rose Gold Fashion', price: 14900, cost: 6000, description: 'Rose-gold case with mesh bracelet.' },
            { title: 'Military Field Watch', price: 9900, cost: 4000, description: 'Rugged military-style field watch.' },
            { title: 'Digital Sports Watch', price: 7900, cost: 3200, description: 'Multifunctional digital sports watch.' },
            { title: 'Vintage Pocket Watch', price: 12900, cost: 5200, description: 'Steampunk-inspired pocket watch with chain.' },
            { title: 'Ladies Crystal Watch', price: 11900, cost: 4800, description: 'Elegant ladies watch with crystal bezel.' },
            { title: 'Solar Power Watch', price: 16900, cost: 6800, description: 'Eco-drive solar powered watch.' },
            { title: 'Titanium Sports Watch', price: 22900, cost: 9200, description: 'Lightweight titanium case with GPS.' },
        ],
    },
    {
        name: 'Perfumes', slug: 'perfumes',
        products: [
            { title: 'Mystic Oud EDP 100ml', price: 12990, cost: 5200, description: 'Rich oriental oud fragrance for men.' },
            { title: 'Rose Bloom EDP 50ml', price: 9990, cost: 4000, description: 'Feminine floral rose and peony scent.' },
            { title: 'Aqua Marine EDT 75ml', price: 7990, cost: 3200, description: 'Fresh aquatic scent for everyday wear.' },
            { title: 'Vanilla Dream EDP 100ml', price: 11990, cost: 4800, description: 'Warm gourmand vanilla and sandalwood.' },
            { title: 'Cedar Sport EDT 100ml', price: 8990, cost: 3600, description: 'Woody sport fragrance with cedar notes.' },
            { title: 'Citrus Burst EDT 50ml', price: 5990, cost: 2400, description: 'Invigorating citrus and bergamot splash.' },
            { title: 'Black Orchid EDP 75ml', price: 14990, cost: 6000, description: 'Dark luxurious floral oriental fragrance.' },
            { title: 'Amber Gold EDP 100ml', price: 13990, cost: 5600, description: 'Rich amber and musk oriental blend.' },
            { title: 'Lavender Fresh EDT 50ml', price: 6990, cost: 2800, description: 'Clean lavender and mint freshness.' },
            { title: 'Oud Royale EDP 30ml', price: 19990, cost: 8000, description: 'Exclusive royal oud concentrate.' },
        ],
    },
    {
        name: 'Sports', slug: 'sports',
        products: [
            { title: 'Yoga Mat Premium', price: 3990, cost: 1600, description: 'Non-slip 6mm thick yoga mat.' },
            { title: 'Resistance Bands Set', price: 2490, cost: 1000, description: 'Set of 5 resistance bands for full-body workouts.' },
            { title: 'Adjustable Dumbbells', price: 19900, cost: 8000, description: '2-24kg adjustable dumbbell pair.' },
            { title: 'Jump Rope Speed', price: 1490, cost: 600, description: 'Ball-bearing speed jump rope.' },
            { title: 'Pull-Up Bar', price: 4990, cost: 2000, description: 'Doorframe pull-up bar, no screws needed.' },
            { title: 'Foam Roller', price: 2990, cost: 1200, description: 'High-density foam roller for recovery.' },
            { title: 'Sports Water Bottle', price: 1990, cost: 800, description: 'BPA-free 1L insulated sports bottle.' },
            { title: 'Knee Sleeves Pair', price: 3490, cost: 1400, description: 'Compression knee sleeves for joint support.' },
            { title: 'AB Wheel Roller', price: 1990, cost: 800, description: 'Double-wheel roller for core training.' },
            { title: 'Gym Gloves', price: 2490, cost: 1000, description: 'Weight-lifting gloves with wrist wrap.' },
        ],
    },
    {
        name: 'Furniture', slug: 'furniture',
        products: [
            { title: 'Ergonomic Office Chair', price: 39900, cost: 16000, description: 'Lumbar-support mesh office chair.' },
            { title: 'Standing Desk', price: 59900, cost: 24000, description: 'Electric height-adjustable standing desk.' },
            { title: 'Bookshelf 5-Tier', price: 14900, cost: 6000, description: 'Industrial style 5-tier metal bookshelf.' },
            { title: 'Coffee Table', price: 19900, cost: 8000, description: 'Marble top coffee table with golden legs.' },
            { title: 'Sofa 3-Seater', price: 89900, cost: 36000, description: 'Plush velvet 3-seater sofa in grey.' },
            { title: 'Dining Chair (Set of 4)', price: 29900, cost: 12000, description: 'Scandinavian solid wood dining chairs.' },
            { title: 'TV Stand', price: 17900, cost: 7200, description: 'Modern floating TV stand with LED lighting.' },
            { title: 'Nightstand', price: 9900, cost: 4000, description: 'Two-drawer solid wood nightstand.' },
            { title: 'Garden Recliner', price: 22900, cost: 9200, description: 'Weather-resistant outdoor recliner.' },
            { title: 'Bean Bag Chair', price: 12900, cost: 5200, description: 'Giant XXL bean bag chair, washable cover.' },
        ],
    },
    {
        name: 'Books', slug: 'books',
        products: [
            { title: 'Atomic Habits', price: 1990, cost: 800, description: 'Build good habits, break bad ones.' },
            { title: 'Rich Dad Poor Dad', price: 1790, cost: 700, description: 'Financial literacy for everyone.' },
            { title: 'The Lean Startup', price: 1990, cost: 800, description: 'How modern companies innovate and survive.' },
            { title: 'Deep Work', price: 1890, cost: 750, description: 'Rules for focused success in a distracted world.' },
            { title: 'Zero to One', price: 1990, cost: 800, description: 'Notes on startups, or how to build the future.' },
            { title: 'The Alchemist', price: 1590, cost: 640, description: 'A novel about following your dreams.' },
            { title: 'Thinking Fast and Slow', price: 2190, cost: 880, description: 'A fascinating exploration of human thinking.' },
            { title: 'Sapiens', price: 2290, cost: 920, description: 'A brief history of humankind.' },
            { title: 'The 4-Hour Work Week', price: 1990, cost: 800, description: 'Escape the 9-5, live anywhere.' },
            { title: '48 Laws of Power', price: 2490, cost: 1000, description: 'The ultimate guide to power dynamics.' },
        ],
    },
];

// Variant definitions per category
const COLORS = ['Black', 'White', 'Navy', 'Red', 'Grey'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

// Categories that get Size+Color variants
const CLOTHING_CATS = new Set(['clothing', 'shoes', 'sports']);
// Categories that get Color-only variants
const COLOR_ONLY_CATS = new Set(['bags', 'watches', 'phones', 'electronics']);
// No variants: perfumes, furniture, books

function getVariantConfigs(categorySlug: string): { colors: string[]; sizes: string[] } {
    if (CLOTHING_CATS.has(categorySlug)) {
        return { colors: COLORS, sizes: SIZES };
    }
    if (COLOR_ONLY_CATS.has(categorySlug)) {
        return { colors: COLORS.slice(0, 3), sizes: [] };
    }
    return { colors: [], sizes: [] };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌱 Starting test store seed...\n');

    // Ensure images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        console.log(`📁 Created images directory: ${IMAGES_DIR}`);
    }

    // ── 1. Tenant ──────────────────────────────────────────────────────────────
    let tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: { name: 'Test Store', slug: TENANT_SLUG },
        });
        console.log(`✅ Created tenant: Test Store (${tenant.id})`);
    } else {
        console.log(`ℹ️  Tenant already exists: ${tenant.slug} (${tenant.id})`);
    }
    const TENANT_ID = tenant.id;

    // ── 2. Admin user ──────────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    let adminUser = await prisma.user.findFirst({
        where: { email: ADMIN_EMAIL, tenantId: TENANT_ID },
    });
    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                email: ADMIN_EMAIL,
                passwordHash: hashedPassword,
                role: 'owner',
                isSuperAdmin: false,
                tenantId: TENANT_ID,
            },
        });
        console.log(`✅ Created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
        await prisma.user.update({
            where: { id: adminUser.id },
            data: { passwordHash: hashedPassword },
        });
        console.log(`ℹ️  Admin user updated: ${ADMIN_EMAIL}`);
    }

    // ── 3. Store Settings ──────────────────────────────────────────────────────
    const storeSettings = await prisma.storeSettings.findUnique({ where: { tenantId: TENANT_ID } });
    if (!storeSettings) {
        await prisma.storeSettings.create({
            data: {
                tenantId: TENANT_ID,
                primaryColor: '#6366f1',
                language: 'fr',
                currencyCode: 'DZD',
                currencyCountry: 'DZ',
                isCompleted: true,
            },
        });
        console.log('✅ Created store settings');
    }

    // ── 4. Categories + Products ───────────────────────────────────────────────
    let totalProducts = 0;

    for (const catDef of CATALOGUE) {
        console.log(`\n📦 Processing category: ${catDef.name}`);

        // Download category image
        const catImgUrls = CATEGORY_IMAGES[catDef.slug] || [];
        let categoryImageUrl: string | null = null;
        if (catImgUrls.length > 0) {
            const ext = 'jpg';
            const fileName = `cat-${catDef.slug}.${ext}`;
            const filePath = path.join(IMAGES_DIR, fileName);
            if (!fs.existsSync(filePath)) {
                console.log(`  ⬇️  Downloading category image...`);
                await downloadImage(catImgUrls[0], filePath);
            }
            categoryImageUrl = `/seed-images/${fileName}`;
        }

        // Upsert category
        const category = await prisma.category.upsert({
            where: { tenantId_slug: { tenantId: TENANT_ID, slug: catDef.slug } },
            update: { imageUrl: categoryImageUrl },
            create: {
                title: catDef.name,
                slug: catDef.slug,
                tenantId: TENANT_ID,
                imageUrl: categoryImageUrl,
            },
        });

        const variantCfg = getVariantConfigs(catDef.slug);

        for (const [productIndex, productDef] of catDef.products.entries()) {
            const slug = productDef.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Download product images (2 images per product)
            const downloadedUrls: string[] = [];
            const imgPool = CATEGORY_IMAGES[catDef.slug] || [];
            for (let i = 0; i < 2 && imgPool.length > 0; i++) {
                const srcUrl = imgPool[(productIndex + i) % imgPool.length];
                const ext = 'jpg';
                const fileName = `prod-${catDef.slug}-${productIndex}-${i}.${ext}`;
                const filePath = path.join(IMAGES_DIR, fileName);
                if (!fs.existsSync(filePath)) {
                    await downloadImage(srcUrl, filePath);
                }
                downloadedUrls.push(`/seed-images/${fileName}`);
            }

            // Upsert product (stock will be corrected below after variants are created)
            const product = await prisma.product.upsert({
                where: { tenantId_slug: { tenantId: TENANT_ID, slug } },
                update: {
                    price: productDef.price,
                    description: productDef.description,
                    categoryId: category.id,
                    isActive: true,
                },
                create: {
                    title: productDef.title,
                    slug,
                    description: productDef.description,
                    miniDescription: productDef.description.slice(0, 80),
                    price: productDef.price,
                    stock: 50, // will be updated to sum of variant stocks below
                    isActive: true,
                    tenantId: TENANT_ID,
                    categoryId: category.id,
                },
            });

            // Upsert ProductImages
            for (const [imgIdx, url] of downloadedUrls.entries()) {
                const existingImg = await prisma.productImage.findFirst({
                    where: { tenantId: TENANT_ID, productId: product.id, url },
                });
                if (!existingImg) {
                    await prisma.productImage.create({
                        data: {
                            tenantId: TENANT_ID,
                            productId: product.id,
                            url,
                            alt: `${productDef.title} - Image ${imgIdx + 1}`,
                            position: imgIdx,
                            isMain: imgIdx === 0,
                        },
                    });
                }
            }

            // Upsert variants (Color + Size or Color only)
            if (variantCfg.colors.length > 0) {
                // Create/ensure option: Color
                let colorOption = await prisma.productOption.findFirst({
                    where: { tenantId: TENANT_ID, productId: product.id, name: 'Color' },
                });
                if (!colorOption) {
                    colorOption = await prisma.productOption.create({
                        data: {
                            tenantId: TENANT_ID,
                            productId: product.id,
                            name: 'Color',
                            position: 0,
                            displayType: 'color',
                        },
                    });
                }

                // Color option values
                const colorValueMap: Record<string, string> = {};
                for (const [ci, color] of variantCfg.colors.entries()) {
                    let val = await prisma.productOptionValue.findFirst({
                        where: { tenantId: TENANT_ID, optionId: colorOption.id, label: color },
                    });
                    if (!val) {
                        val = await prisma.productOptionValue.create({
                            data: {
                                tenantId: TENANT_ID,
                                optionId: colorOption.id,
                                label: color,
                                position: ci,
                            },
                        });
                    }
                    colorValueMap[color] = val.id;
                }

                let sizeOption: Awaited<ReturnType<typeof prisma.productOption.findFirst>> = null;
                const sizeValueMap: Record<string, string> = {};

                if (variantCfg.sizes.length > 0) {
                    sizeOption = await prisma.productOption.findFirst({
                        where: { tenantId: TENANT_ID, productId: product.id, name: 'Size' },
                    });
                    if (!sizeOption) {
                        sizeOption = await prisma.productOption.create({
                            data: {
                                tenantId: TENANT_ID,
                                productId: product.id,
                                name: 'Size',
                                position: 1,
                                displayType: 'button',
                            },
                        });
                    }

                    for (const [si, size] of variantCfg.sizes.entries()) {
                        let val = await prisma.productOptionValue.findFirst({
                            where: { tenantId: TENANT_ID, optionId: sizeOption.id, label: size },
                        });
                        if (!val) {
                            val = await prisma.productOptionValue.create({
                                data: {
                                    tenantId: TENANT_ID,
                                    optionId: sizeOption.id,
                                    label: size,
                                    position: si,
                                },
                            });
                        }
                        sizeValueMap[size] = val.id;
                    }
                }

                // Create variants
                const colorList = variantCfg.colors;
                const sizeList = variantCfg.sizes.length > 0 ? variantCfg.sizes : [''];

                for (const color of colorList) {
                    for (const size of sizeList) {
                        const skuParts = [catDef.slug.slice(0, 3).toUpperCase(), String(productIndex + 1).padStart(2, '0'), color.slice(0, 2).toUpperCase()];
                        if (size) skuParts.push(size);
                        const sku = skuParts.join('-');

                        let variant = await prisma.productVariant.findFirst({
                            where: { tenantId: TENANT_ID, sku },
                        });
                        if (!variant) {
                            variant = await prisma.productVariant.create({
                                data: {
                                    tenantId: TENANT_ID,
                                    productId: product.id,
                                    sku,
                                    price: productDef.price,
                                    cost: productDef.cost,
                                    stock: 20,
                                    isActive: true,
                                    trackInventory: true,
                                },
                            });

                            // Link color option value
                            await prisma.productVariantOptionValue.create({
                                data: {
                                    tenantId: TENANT_ID,
                                    variantId: variant.id,
                                    optionValueId: colorValueMap[color],
                                },
                            });

                            // Link size option value if present
                            if (size && sizeValueMap[size]) {
                                await prisma.productVariantOptionValue.create({
                                    data: {
                                        tenantId: TENANT_ID,
                                        variantId: variant.id,
                                        optionValueId: sizeValueMap[size],
                                    },
                                });
                            }
                        }
                    }
                }
            }

            // Update product.stock to reflect total variant inventory (or 50 for no-variant products)
            const variantCount = await prisma.productVariant.count({
                where: { tenantId: TENANT_ID, productId: product.id },
            });
            await prisma.product.update({
                where: { id: product.id },
                data: { stock: variantCount > 0 ? variantCount * 20 : 50 },
            });

            totalProducts++;
            process.stdout.write(`  ✓ [${totalProducts}/100] ${productDef.title} (stock: ${variantCount > 0 ? variantCount * 20 : 50})\n`);
        }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Tenant:   Test Store (slug: ${TENANT_SLUG})`);
    console.log(`   Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`   Products: ${totalProducts}`);
    console.log(`   Images:   ${IMAGES_DIR}`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
