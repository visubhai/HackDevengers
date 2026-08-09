
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function inspectBooking() {
    try {
        console.log('Logging in as hirabagh...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'hirabagh',
            password: 'savan8980'
        });
        const token = loginRes.data.token;

        console.log('Fetching H8/0018...');
        const res = await axios.get(`${API_URL}/bookings?lrNumber=H8/0018`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const bookings = res.data;
        if (bookings.length === 0) {
            console.log('Booking H8/0018 not found.');
            return;
        }

        const booking = bookings[0];
        console.log('--- Booking H8/0018 ---');
        console.log(`ID: ${booking._id}`);
        console.log(`Status: ${booking.status}`);
        console.log(`Delivered Remark: "${booking.deliveredRemark}"`);
        console.log(`Collected By: "${booking.collectedBy}"`);
        console.log(`Collected Mobile: "${booking.collectedByMobile}"`);
        console.log(`Raw Object Keys:`, Object.keys(booking));

    } catch (error: any) {
        console.error('Inspect Failed:', error.response?.data || error.message);
    }
}

inspectBooking();
