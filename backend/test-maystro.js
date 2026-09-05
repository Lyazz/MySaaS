import axios from 'axios';

const TOKEN = 'aeed5babd0f07e3bb2b44f37db4a1b4d00756f23';
const UUID = 'c5487cbe-42e9-4469-b02d-e5864cca3f8b';

const headers = {
    'Authorization': `Token ${TOKEN}`,
    'Content-Type': 'application/json'
};

async function testEndpoint(url) {
    console.log(`Testing GET ${url}...`);
    try {
        const res = await axios.get(url, { headers });
        console.log(`[SUCCESS] Status: ${res.status}`);
        if (res.data) {
            console.log(`[DATA] Keys: ${Object.keys(res.data).join(', ')}`);
            console.log(`[DATA] id=${res.data.id}, status=${res.data.status}, tracking=${res.data.tracking}, display_id=${res.data.display_id}, external_id=${res.data.external_id}`);
        }
    } catch (error) {
        console.log(`[FAILED] Status: ${error.response?.status} - ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
    }
    console.log('-----------------------------------');
}

async function runTests() {
    await testEndpoint(`https://b.maystro-delivery.com/api/orders/${UUID}/`);
    await testEndpoint(`https://orders-management.maystro-delivery.com/api/orders/${UUID}/`);
}

runTests();
