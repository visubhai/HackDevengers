
class WhatsappService {
    private ready: boolean = false;
    private qrCode: string | null = null;
    private status: string = 'PERMANENTLY_DISABLED';

    constructor() {
        console.log('⏸️ WhatsApp Service is PERMANENTLY DISABLED to maximize server performance.');
    }

    private initialize() {
        // Disabled
    }

    public async sendMessage(to: string, message: string): Promise<boolean> {
        // Always return false as service is disabled
        return false;
    }

    public async logout(): Promise<void> {
        console.log('⏸️ WhatsApp Service is disabled. Logout ignored.');
    }

    public isReady(): boolean {
        return false;
    }

    public getQrCode(): string | null {
        return null;
    }

    public getStatus(): string {
        return 'DISABLED';
    }
}

export const whatsappService = new WhatsappService();
