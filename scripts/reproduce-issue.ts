
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function reproduceIssue() {
    try {
        console.log('Logging in as hirabagh...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'hirabagh',
            password: 'savan8980'
        });
        const token = loginRes.data.token;

        // Find a booking to update (e.g., H8/0016 from screenshot)
        console.log('Fetching H8/0016...');
        const res = await axios.get(`${API_URL}/bookings?lrNumber=H8/0016`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.data || res.data.length === 0) {
            console.error('Booking not found!');
            return;
        }

        const booking = res.data[0];
        console.log('Found booking:', booking.lrNumber, booking._id);

        // Mimic the EXACT payload the frontend sends when "Save Changes" is clicked
        // The error suggests "Failed to update booking", which calls PUT /bookings/:id
        // We will try to send a body similar to what the frontend constructs
        const payload = {
            ...booking,
            // The frontend might be sending fields that are now "null" or "undefined" or specific strings
            // Replicating what the user sees in screenshot:
            status: "Delivered", // Title case as seen in dropdown
            deliveredRemark: "dedede",
            // It seems "Collected By" fields might be empty/null if not filled
            collectedBy: null, // or ""
            collectedByMobile: null, // or ""
            // The frontend sends the whole object usually
        };

        // Remove uneditable fields that might cause issues if strict schema (though I removed them from schema before?)
        // Let's just send what we think causes the crash
        console.log('Attempting PUT update with payload matching Edit Modal...');

        try {
            const updateRes = await axios.put(`${API_URL}/bookings/${booking._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Update Successful:', updateRes.data);
        } catch (putError: any) {
            console.error('Update Failed Status:', putError.response?.status);
            console.error('Update Failed Data:', JSON.stringify(putError.response?.data, null, 2));
        }

    } catch (error: any) {
        console.error('Test Failed:', error.message);
    }
}

reproduceIssue();
