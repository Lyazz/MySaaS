
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getTenantId = async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'apple' } });
    if (!tenant) throw new Error('Apple tenant not found. Please run seed_debug.js first.');
    return tenant.id;
};

const categoryImages: Record<string, string> = {
    iPhone: 'https://dummyimage.com/960x640/111827/ffffff.png&text=iPhone',
    MacBook: 'https://dummyimage.com/960x640/0f172a/ffffff.png&text=MacBook',
    iPad: 'https://dummyimage.com/960x640/1e293b/ffffff.png&text=iPad',
    Watch: 'https://dummyimage.com/960x640/0ea5e9/ffffff.png&text=Watch',
    Accessories: 'https://dummyimage.com/960x640/0f766e/ffffff.png&text=Accessories'
};

type ProductSeed = {
    title: string;
    price: number;
    description: string;
};

type CategorySeed = {
    category: string;
    products: ProductSeed[];
};

const imageLibrary: Record<string, string[]> = {
    iphone: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1495433324511-bf8e92934d90?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1600&q=80'
    ],
    macbook: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=80'
    ],
    ipad: [
        'https://images.unsplash.com/photo-1744215328170-6ab500ed6ce7?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1561419489-e32303e034f3?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1544244015-9c72fd9c866d?auto=format&fit=crop&w=1600&q=80'
    ],
    watch: [
        'https://images.unsplash.com/photo-1664730021934-462a83e359e4?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1542477636-d8ee5110af14?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1638257501472-830885929bfc?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1644931973285-6c2b52b1d744?auto=format&fit=crop&w=1600&q=80'
    ],
    accessories: [
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=1600&q=80'
    ]
};

const data: CategorySeed[] = [
    {
        category: 'iPhone',
        products: [
            { title: 'iPhone 15 Pro Max', price: 1199, description: 'The ultimate iPhone with titanium design.' },
            { title: 'iPhone 15 Pro', price: 999, description: 'Pro camera system and A17 Pro chip.' },
            { title: 'iPhone 15 Plus', price: 899, description: 'Big screen, big battery.' },
            { title: 'iPhone 15', price: 799, description: 'Dynamic Island and 48MP Main camera.' },
            { title: 'iPhone 14 Plus', price: 799, description: 'Dual-camera system and superfast 5G.' },
            { title: 'iPhone 14', price: 699, description: 'Great battery life and safety features.' },
            { title: 'iPhone 13 mini', price: 599, description: 'Small size, big power.' },
            { title: 'iPhone 13', price: 599, description: 'Advanced dual-camera system.' },
            { title: 'iPhone SE (3rd generation)', price: 429, description: 'Powerful chip in a classic design.' },
            { title: 'iPhone 12', price: 499, description: 'Speed of 5G and A14 Bionic.' }
        ]
    },
    {
        category: 'MacBook',
        products: [
            { title: 'MacBook Pro 16-inch (M3 Max)', price: 3499, description: 'The most powerful MacBook ever.' },
            { title: 'MacBook Pro 14-inch (M3 Max)', price: 3199, description: 'Pro performance in a compact sizes.' },
            { title: 'MacBook Pro 16-inch (M3 Pro)', price: 2499, description: 'Epic battery life and peak performance.' },
            { title: 'MacBook Pro 14-inch (M3 Pro)', price: 1999, description: 'Brilliant Liquid Retina XDR display.' },
            { title: 'MacBook Pro 14-inch (M3)', price: 1599, description: 'The power of M3 in a 14-inch design.' },
            { title: 'MacBook Air 15-inch (M3)', price: 1299, description: 'Supercharged by M3.' },
            { title: 'MacBook Air 13-inch (M3)', price: 1099, description: 'Thinner, lighter, faster.' },
            { title: 'MacBook Air 15-inch (M2)', price: 1199, description: 'Strikingly thin and fast.' },
            { title: 'MacBook Air 13-inch (M2)', price: 999, description: 'The most popular MacBook.' },
            { title: 'MacBook Air 13-inch (M1)', price: 899, description: 'The classic power of M1.' }
        ]
    },
    {
        category: 'iPad',
        products: [
            { title: 'iPad Pro 12.9-inch (M2)', price: 1099, description: 'The ultimate iPad experience.' },
            { title: 'iPad Pro 11-inch (M2)', price: 799, description: 'Pro performance in every way.' },
            { title: 'iPad Air (M1)', price: 599, description: 'Powerful, colorful, wonderful.' },
            { title: 'iPad (10th generation)', price: 449, description: 'Lovable, drawable, magical.' },
            { title: 'iPad (9th generation)', price: 329, description: 'Everything you need in an iPad.' },
            { title: 'iPad mini (6th generation)', price: 499, description: 'Mega power, mini size.' },
            { title: 'iPad Pro 12.9-inch (M1)', price: 999, description: 'The first M1 iPad.' },
            { title: 'iPad Pro 11-inch (M1)', price: 699, description: 'Compact Pro power.' },
            { title: 'iPad Air (4th generation)', price: 499, description: 'Versatile and powerful.' },
            { title: 'iPad Air (5th generation)', price: 549, description: 'Even faster with M1.' }
        ]
    },
    {
        category: 'Watch',
        products: [
            { title: 'Apple Watch Ultra 2', price: 799, description: 'The ultimate sports watch.' },
            { title: 'Apple Watch Series 9', price: 399, description: 'Smarter, brighter, mightier.' },
            { title: 'Apple Watch SE (2nd gen)', price: 249, description: 'All the essentials you love.' },
            { title: 'Apple Watch Ultra', price: 699, description: 'The original rugged watch.' },
            { title: 'Apple Watch Series 8', price: 349, description: 'Crack resistant, swimproof.' },
            { title: 'Apple Watch SE (1st gen)', price: 199, description: 'Great features, great price.' },
            { title: 'Apple Watch Series 7', price: 299, description: 'Advanced features for everyone.' },
            { title: 'Apple Watch Series 6', price: 249, description: 'Blood oxygen and heart health.' },
            { title: 'Apple Watch Series 5', price: 199, description: 'Always-On Retina display.' },
            { title: 'Apple Watch Series 4', price: 149, description: 'Fall detection and ECG.' }
        ]
    },
    {
        category: 'Accessories',
        products: [
            { title: 'AirPods Pro (2nd generation)', price: 249, description: 'Now with USB-C charging.' },
            { title: 'AirPods (3rd generation)', price: 169, description: 'Spatial audio with dynamic head tracking.' },
            { title: 'AirPods Max', price: 549, description: 'The ultimate listening experience.' },
            { title: 'AirPods (2nd generation)', price: 129, description: 'Simple, wireless, magical.' },
            { title: 'MagSafe Charger', price: 39, description: 'Snap on for fast wireless charging.' },
            { title: 'AirTag (4 Pack)', price: 99, description: 'Lose your knack for losing things.' },
            { title: 'Magic Mouse', price: 79, description: 'The most seamless mouse.' },
            { title: 'Magic Keyboard with Touch ID', price: 149, description: 'Fast, easy, secure authentication.' },
            { title: 'HomePod mini', price: 99, description: 'Jam-packed with innovation.' },
            { title: 'USB-C to Lightning Cable (1m)', price: 19, description: 'Connect your iPhone with ease.' }
        ]
    }
];

const getImagesForProduct = (categorySlug: string, index: number) => {
    const pool = imageLibrary[categorySlug] || [];
    if (pool.length === 0) return [];

    // Rotate through pool to give each product at least two images
    const first = pool[index % pool.length];
    const second = pool[(index + 1) % pool.length];
    return pool.length === 1 ? [first] : [first, second];
};

async function main() {
    const TENANT_ID = await getTenantId();
    console.log(`Seeding products for Apple Store (${TENANT_ID})...`);

    for (const item of data) {
        const categorySlug = item.category.toLowerCase().replace(/ /g, '-');
        const imageUrl = categoryImages[item.category] || null;

        // Create Category
        const category = await prisma.category.upsert({
            where: {
                tenantId_slug: {
                    tenantId: TENANT_ID,
                    slug: categorySlug
                }
            },
            update: {
                imageUrl
            },
            create: {
                title: item.category,
                slug: categorySlug,
                tenantId: TENANT_ID,
                imageUrl
            }
        });

        console.log(`Created/Ensured category: ${category.title}`);

        for (const [index, p] of item.products.entries()) {
            const productSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const images = getImagesForProduct(categorySlug, index);

            await prisma.product.upsert({
                where: {
                    tenantId_slug: {
                        tenantId: TENANT_ID,
                        slug: productSlug
                    }
                },
                update: {
                    price: p.price,
                    description: p.description,
                    categoryId: category.id,
                    stock: 100,
                    isActive: true,
                    images
                },
                create: {
                    title: p.title,
                    slug: productSlug,
                    description: p.description,
                    price: p.price,
                    stock: 100,
                    isActive: true,
                    images,
                    tenantId: TENANT_ID,
                    categoryId: category.id
                }
            });
        }
        console.log(`Seeded 10 products for ${category.title}`);
    }

    console.log('Seeding finished successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
