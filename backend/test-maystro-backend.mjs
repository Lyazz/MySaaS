const TOKEN = 'aeed5babd0f07e3bb2b44f37db4a1b4d00756f23';
const BASE_URL = 'https://backend.maystro-delivery.com/api';

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
    console.log(`Response: ${text.substring(0, 200)}`);
}

async function runTests() {
    console.log(`Testing with base URL: ${BASE_URL}`);
    await fetchMaystro('/base/wilayas/');
    await fetchMaystro('/base/communes/?wilaya=16');
}

runTests();
