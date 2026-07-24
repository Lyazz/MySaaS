const TOKEN = 'aeed5babd0f07e3bb2b44f37db4a1b4d00756f23';
const BASE_URL = 'https://orders-management.maystro-delivery.com/api';

async function fetchMaystro(path, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Authorization': `Token ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, options);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response:`, text);
}

async function runTests() {
    const orderPayload = {
        customer_name: "Test Name Dupe",
        customer_phone: "0555555557",
        destination_text: "Test Address",
        total_price: 1500,
        delivery_type: 1,
        commune: "Adrar",
        wilaya: "Adrar",
        details: [{ description: "Test Product A", quantity: 1, product: "test_product_123" }]
    };

    console.log('Sending first order...');
    await fetchMaystro('/orders/', 'POST', orderPayload);
    
    console.log('Sending second (duplicate) order...');
    await fetchMaystro('/orders/', 'POST', orderPayload);
}

runTests();
