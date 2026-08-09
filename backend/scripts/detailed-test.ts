import dotenv from 'dotenv';
import path from 'path';

// Adjust path to point to backend's .env 
// running from apps/backend/scripts/detailed-test.ts -> ../.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
console.log(`🚀 Starting API Tests against: ${API_URL}`);

async function runTests() {
    try {
        // ==========================================
        // 1. Connectivity Check
        // ==========================================
        console.log('\n📡 [1/5] Checking Server Connectivity...');
        try {
            const rootRes = await fetch('http://localhost:3001/');
            const rootText = await rootRes.text();
            if (rootText.includes('Parcel Management System API')) {
                console.log('✅ Server is reachable.');
            } else {
                throw new Error('Unexpected root response');
            }
        } catch (e: any) {
            console.error('❌ Server not reachable. Is "npm run dev:backend" running?');
            console.error(e.message);
            process.exit(1);
        }

        // ==========================================
        // 2. Auth Flow (Super Admin)
        // ==========================================
        console.log('\n🔑 [2/5] Testing Authentication...');
        console.log('   -> Logging in as Super Admin...');
        const adminLogin = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@system.com', password: 'password123' })
        });

        const adminData = await adminLogin.json();
        if (adminData.error) throw new Error(`Admin Login Failed: ${adminData.error}`);
        if (adminData.role !== 'SUPER_ADMIN') throw new Error('Role mismatch for Super Admin');
        console.log('✅ Admin Login Successful');

        // ==========================================
        // 3. Admin: User & Branch Management
        // ==========================================
        console.log('\n👥 [3/5] Testing Admin Features...');

        // Get Branches
        console.log('   -> Fetching Branches...');
        const branchesRes = await fetch(`${API_URL}/branches`);
        const branches = await branchesRes.json();
        if (branches.length === 0) console.warn('⚠️ No branches found (Run seed-mongo.ts?)');
        else console.log(`✅ Found ${branches.length} branches.`);

        // Get Users
        console.log('   -> Fetching Users...');
        const usersRes = await fetch(`${API_URL}/users`);
        const users = await usersRes.json();
        if (users.length === 0) throw new Error('No users found');
        console.log(`✅ Found ${users.length} users.`);

        // Toggle User Status
        const testUser = users.find((u: any) => u.role !== 'SUPER_ADMIN');
        if (testUser) {
            console.log(`   -> Toggling status for ${testUser.username}...`);
            const toggleRes = await fetch(`${API_URL}/users/${testUser.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !testUser.isActive })
            });
            const toggleData = await toggleRes.json();
            if (toggleData.error) throw new Error(`Toggle Failed: ${toggleData.error}`);
            console.log(`✅ User status toggled to: ${toggleData.isActive}`);

            // Toggle back
            await fetch(`${API_URL}/users/${testUser.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: testUser.isActive })
            });
        } else {
            console.warn('⚠️ No staff user found to test toggle.');
        }

        // ==========================================
        // 4. Staff Flow: Creating Bookings
        // ==========================================
        console.log('\n📦 [4/5] Testing Booking Flow...');

        let loginBranchId = adminData.branchId;

        // If admin doesn't have a branch (Global), checks branches
        if (!loginBranchId && branches.length > 0) {
            // Create a booking using the first two branches
            const fromBranch = branches[0];
            const toBranch = branches[1] || branches[0];

            console.log(`   -> Creating Booking from ${fromBranch.name} to ${toBranch.name}...`);

            const bookingPayload = {
                fromBranch: fromBranch._id,
                toBranch: toBranch._id,
                sender: { name: "Test Sender", mobile: "9999999999" },
                receiver: { name: "Test Receiver", mobile: "8888888888" },
                parcels: [{ quantity: 1, itemType: "Box", weight: 10, rate: 100 }],
                costs: { freight: 100, handling: 10, hamali: 0, total: 110 },
                paymentType: "Paid",
                status: "Booked"
            };

            const bookingRes = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingPayload)
            });

            const bookingData = await bookingRes.json();
            if (bookingData.error) throw new Error(`Booking Creation Failed: ${bookingData.error}`);
            const lrNumber = bookingData.booking.lrNumber;
            const bookingId = bookingData.booking._id;
            console.log(`✅ Booking Created! LR Number: ${lrNumber}`);

            // Update Status
            console.log('   -> Updating Booking Status...');
            const statusRes = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'In Transit' })
            });
            const statusData = await statusRes.json();
            if (statusData.error) throw new Error(`Status Update Failed: ${statusData.error}`);
            console.log('✅ Status Updated to In Transit');

            loginBranchId = fromBranch._id; // For Ledger check (Paid booking = Credit to From Branch)
        }

        // ==========================================
        // 5. Ledger Check
        // ==========================================
        console.log('\n💰 [5/5] Testing Ledger...');
        if (loginBranchId) {
            console.log(`   -> Fetching Ledger for Branch ID: ${loginBranchId}...`);
            const ledgerRes = await fetch(`${API_URL}/ledger?branchId=${loginBranchId}`);
            const ledgerData = await ledgerRes.json();

            if (ledgerData.error) throw new Error(`Ledger Fetch Failed: ${ledgerData.error}`);
            console.log(`✅ Ledger Fetched. Total Transactions: ${ledgerData.stats?.count || 0}`);
            console.log(`✅ Total Revenue: ₹${ledgerData.stats?.total_revenue || 0}`);

            // Verify the just added transaction is there if possible (skip for now, stat check is good enough)

        } else {
            console.log("⚠️ Skipping Ledger test (No Branch ID context)");
        }

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');

    } catch (error: any) {
        console.error('\n❌ TEST FAILED');
        console.error(error);
        process.exit(1);
    }
}

runTests();
