
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { smsService } from '../services/smsService';

const mobile = process.argv[2];

if (!mobile) {
    console.error('Usage: npx tsx src/scripts/test-sms.ts <mobile_number>');
    process.exit(1);
}

console.log(`Testing SMS to ${mobile}...`);
console.log(`Using API Key: ${process.env.SMS_API_KEY ? 'Yes (Hidden)' : 'No (Missing)'}`);

(async () => {
    const success = await smsService.sendSms(mobile, 'Test Message from Savan Logistics System.');
    if (success) {
        console.log('✅ SMS Sent Successfully!');
    } else {
        console.error('❌ SMS Failed! Check previous logs for details.');
    }
})();
