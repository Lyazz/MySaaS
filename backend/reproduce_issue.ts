
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const EMAIL = 'admin@apple.com';
const PASSWORD = 'password';

async function testIntegration() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');

    // 2. Try to GET Telegram Integration (Expect Failure with current code)
    console.log('Fetching Telegram integration...');
    try {
        const getRes = await axios.get(`${API_URL}/admin/integrations/TELEGRAM`, {
        headers: { Authorization: `Bearer ${token}` }
        });
        console.log('GET Success:', getRes.data);
    } catch (err: any) {
        console.error('GET Failed as expected:', err.response ? err.response.data : err.message);
    }

    // 3. Try to SAVE (POST) Telegram Integration (Expect Failure)
    console.log('Saving Telegram integration...');
    try {
        const postRes = await axios.post(`${API_URL}/admin/integrations/TELEGRAM`, {
            config: { botToken: 'test', chatId: '123' },
            isActive: true
        }, {
        headers: { Authorization: `Bearer ${token}` }
        });
        console.log('POST Success:', postRes.data);
    } catch (err: any) {
        console.error('POST Failed as expected:', err.response ? err.response.data : err.message);
    }

  } catch (error: any) {
    console.error('Test script error:', error.response ? error.response.data : error.message);
  }
}

testIntegration();

