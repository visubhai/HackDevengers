
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function testDelivery() {
    try {
        // 1. Login as Hirabagh to create booking
        console.log('Logging in as hirabagh...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'hirabagh',
            password: 'savan8980'
        });
        const token = loginRes.data.token;
        const branchId = loginRes.data.user.branchId;
        console.log('Login successful. Token obtained.');

        // 2. Create a Booking
        console.log('Creating booking...');
        const bookingData = {
            fromBranch: branchId,
            toBranch: '697f566a6d2baf1ee6f79ef5', // Bapunagar (Guessing ID from previous logs or random valid ID)
            // Wait, I need a valid toBranch ID. I'll fetch branches first.
            sender: { name: 'Test Sender', mobile: '1234567890' },
            receiver: { name: 'Test Receiver', mobile: '9876543210' },
            parcels: [{ quantity: 1, itemType: 'Box', weight: 1, rate: 100 }],
            costs: { freight: 100, handling: 10, hamali: 0, total: 110 },
            paymentType: 'Paid'
        };

        // Fetch branches to get a valid ID
        const branchesRes = await axios.get(`${API_URL}/branches`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const bapunagar = branchesRes.data.find((b: any) => b.name.toLowerCase().includes('bapunagar'));
        if (!bapunagar) throw new Error('Bapunagar branch not found');
        bookingData.toBranch = bapunagar._id;

        const bookingRes = await axios.post(`${API_URL}/bookings`, bookingData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const bookingId = bookingRes.data.booking._id;
        const lrNumber = bookingRes.data.booking.lrNumber;
        console.log(`Booking created: ${lrNumber} (${bookingId})`);

        // 3. Login as Bapunagar to Deliver
        console.log('Logging in as bapunagar...');
        const loginRes2 = await axios.post(`${API_URL}/auth/login`, {
            username: 'bapunagar',
            password: '888942' // Assuming this is correct from user
        });
        const token2 = loginRes2.data.token;

        // 4. Update Status to DELIVERED with Collected By
        console.log('Delivering parcel...');
        const deliveryData = {
            status: 'DELIVERED',
            deliveredRemark: 'Test Delivery Remark',
            collectedBy: 'Mr Test Collector',
            collectedByMobile: '9998887776'
        };

        await axios.patch(`${API_URL}/bookings/${bookingId}/status`, deliveryData, {
            headers: { Authorization: `Bearer ${token2}` }
        });
        console.log('Delivery status updated.');

        // 5. Verify Data Persistence
        console.log('Verifying data...');
        const verifyRes = await axios.get(`${API_URL}/bookings?lrNumber=${lrNumber}`, {
            headers: { Authorization: `Bearer ${token}` } // Check as original user (or any admin)
        });

        const booking = verifyRes.data[0];
        if (!booking) throw new Error('Booking not found during verification');

        console.log('--- Verification Result ---');
        console.log(`LR: ${booking.lrNumber}`);
        console.log(`Status: ${booking.status}`);
        console.log(`Delivered Remark: ${booking.deliveredRemark}`);
        console.log(`Collected By: ${booking.collectedBy}`);
        console.log(`Collected Mobile: ${booking.collectedByMobile}`);

        if (booking.collectedBy === 'Mr Test Collector' && booking.collectedByMobile === '9998887776') {
            console.log('SUCCESS: Data persistence verified.');
        } else {
            console.error('FAILURE: Data mismatch.');
        }

    } catch (error: any) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testDelivery();
