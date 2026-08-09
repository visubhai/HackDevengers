/**
 * Utility to generate WhatsApp click-to-chat links (wa.me)
 * This is a zero-RAM, zero-cost solution for sending notifications.
 */

export interface WhatsAppMessageData {
    mobile: string;
    lrNumber: string;
    status: string;
    fromBranch: string;
    toBranch: string;
    senderName: string;
    receiverName: string;
    amount?: number;
    paymentStatus?: string;
}

import { fetchApi } from "@/frontend/services/base";

export function generateWhatsAppMessage(data: WhatsAppMessageData): string {
    const { lrNumber, status, fromBranch, toBranch, senderName, receiverName, amount, paymentStatus } = data;

    const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return `🚚 *BOOKING SUCCESSFUL*\n` +
        `*LOGIOPEN LOGISTICS*\n\n` +
        `Dear *${senderName}*,\n` +
        `Your parcel is processed and ready for transit.\n\n` +
        `📄 *LR Number:* ${lrNumber}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📍 *Origin:* ${fromBranch}\n` +
        `🏁 *Destination:* ${toBranch}\n` +
        `👤 *Receiver:* ${receiverName}\n` +
        `💰 *Total:* ₹${amount?.toFixed(2)} (${paymentStatus})\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `✅ *Status:* ${status}\n` +
        `📅 *Date:* ${dateStr}\n\n` +
        `_Thank you for choosing LogiOpen Logistics. Track your parcel using the LR number above._`;
}

export async function openWhatsApp(data: WhatsAppMessageData, addToast?: (msg: string, type: 'success' | 'error' | 'info') => void) {
    const message = generateWhatsAppMessage(data);

    addToast?.("Sending WhatsApp...", "info");

    try {
        // Attempt Direct Send (Background Bot)
        const res = await fetchApi('/whatsapp/direct-send', {
            method: 'POST',
            body: JSON.stringify({ mobile: data.mobile, message })
        });

        if (res.ok) {
            const result = await res.json();
            if (result.success) {
                addToast?.("WhatsApp Sent Directly! ✅", "success");
                return;
            }
        }

        // Fallback to Click-to-chat if bot is not linked or fails
        const sanitizedMobile = data.mobile.replace(/\D/g, "");
        const phone = sanitizedMobile.length === 10 ? "91" + sanitizedMobile : sanitizedMobile;
        const link = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        addToast?.("Bot not linked. Opening WhatsApp Web...", "info");
        window.open(link, "_blank");
    } catch (e) {
        // Ultimate fallback
        const sanitizedMobile = data.mobile.replace(/\D/g, "");
        const phone = sanitizedMobile.length === 10 ? "91" + sanitizedMobile : sanitizedMobile;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    }
}
