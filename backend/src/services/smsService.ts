
import axios from 'axios';

class SmsService {
    private baseUrl: string = 'https://www.fast2sms.com/dev/bulkV2';

    constructor() { }

    /**
     * Send SMS using Fast2SMS
     * @param mobile - 10 digit mobile number
     * @param message - Message content
     */
    public async sendSms(mobile: string, message: string): Promise<boolean> {
        const apiKey = process.env.SMS_API_KEY;

        if (!apiKey) {
            console.warn('⚠️ SMS_API_KEY not found in env. Running in MOCK mode.');
            console.log(`[MOCK SMS] To: ${mobile}, Message: ${message}`);
            return true;
        }

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    authorization: apiKey,
                    message: message,
                    language: 'english',
                    route: 'q', // 'q' for Quick transactional route, 't' for Transactional
                    numbers: mobile,
                },
            });

            if (response.data && response.data.return) {
                console.log(`✅ SMS sent successfully to ${mobile}`);
                return true;
            } else {
                console.error(`❌ SMS failed: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error: any) {
            if (error.response) {
                console.error(`❌ SMS Error Response:`, JSON.stringify(error.response.data, null, 2));
            }
            console.error(`❌ SMS Error Message: ${error.message}`);
            return false;
        }
    }
}

export const smsService = new SmsService();
