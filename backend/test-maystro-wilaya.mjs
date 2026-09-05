const TOKEN = 'aeed5babd0f07e3bb2b44f37db4a1b4d00756f23';
const BASE_URL = 'https://orders-management.maystro-delivery.com/api';

async function fetchMaystro(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    const text = await res.text();
    console.log(`Path: ${path} | Status: ${res.status}`);
    return text ? JSON.parse(text) : null;
}

async function runTests() {
    const wilayas = await fetchMaystro('/base/wilayas/');
    const algiers = wilayas.find(w => w.code === 16 || w.name_lt === 'Alger');
    console.log('Algiers wilaya object:', algiers);
    
    // Fetch with ID 16
    console.log('\n--- Fetching with wilaya=16 ---');
    await fetchMaystro('/base/communes/?wilaya=16');

    if (algiers) {
        console.log(`\n--- Fetching with wilaya=${algiers.id} ---`);
        await fetchMaystro(`/base/communes/?wilaya=${algiers.id}`);
        
        console.log(`\n--- Fetching with wilaya=${algiers.display_id} ---`);
        await fetchMaystro(`/base/communes/?wilaya=${algiers.display_id}`);
    }
}

runTests();
