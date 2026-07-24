const TOKEN = 'aeed5babd0f07e3bb2b44f37db4a1b4d00756f23';
const STORE_ID = 'e75e6148-a0ef-4e61-947b-450b0d01e959';
const BASE_URL = 'https://b.maystro-delivery.com/api';

async function fetchMaystro(path, method = 'GET', body = null) {
    console.log(`\n--- Fetching: ${path} [Tag: Centella] ---`);
    try {
        const options = {
            method: method,
            headers: {
                'Authorization': `Token ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`${BASE_URL}${path}`, options);
        
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Response:`, text.length > 500 ? text.substring(0, 500) + '... (truncated)' : text);
        return text ? JSON.parse(text) : null;
    } catch (e) {
        console.log('Error during fetch:', e.message);
        return null;
    }
}

async function runTests() {
    console.log(`Starting Maystro API Tests with new BASE_URL: ${BASE_URL}... [Tag: Centella]`);
    
    // Test: Create Order
    const orderPayload = [{
        customer_name: "Centella Test User",
        customer_phone: "0555555555",
        destination_text: "Test address, Algiers",
        total_price: 1500,
        delivery_type: 1, // 1 = home delivery
        commune: "1",     // Oran or Adrar etc
        wilaya: "1",
        details: [
            {
                description: "Test Product Centella",
                quantity: 1
            }
        ]
    }];

    await fetchMaystro('/orders', 'POST', orderPayload);
    
    // Test: Create Order with trailing slash just in case
    await fetchMaystro('/orders/', 'POST', orderPayload);
    
    console.log("\nFinished Maystro API Order Creation Tests. [Tag: Centella]");
}

runTests();
