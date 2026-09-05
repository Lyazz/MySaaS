import { MaystroLocationService } from './src/modules/delivery/maystro/maystro-location.service.ts';
import { getMaystroCredentials } from './src/modules/delivery/maystro/maystro.credentials.ts';
import prisma from './src/lib/prisma.ts';

async function main() {
    try {
        console.log('ENV MAYSTRO_BASE_URL:', process.env.MAYSTRO_BASE_URL);
        const creds = await prisma.deliveryCredential.findFirst({ where: { provider: 'MAYSTRO' } });
        console.log('Got creds?', !!creds);
        
        const loc = new MaystroLocationService();
        console.log('Fetching wilayas...');
        const wilayas = await loc.listWilayas({ apiToken: creds?.apiToken });
        console.log('Wilayas count:', wilayas.length);
        
        console.log('Fetching communes for wilaya=16...');
        const communes = await loc.listCommunes({ apiToken: creds?.apiToken, wilaya: '16' });
        console.log('Communes found:', communes.length);
    } catch (e: any) {
        console.error('ERROR:', e.message);
        if (e.statusCode) {
            console.error('Status:', e.statusCode, e.statusMessage);
            console.error('Details:', e.details);
        }
    } finally {
        await prisma.$disconnect();
    }
}
main();
