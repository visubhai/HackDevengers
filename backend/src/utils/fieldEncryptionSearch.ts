import crypto from 'crypto';

// Mirrors the encryption used by the `mongoose-field-encryption` plugin on the Booking
// model (see Booking.ts) so we can build an exact-match query against encrypted fields.
// The plugin uses a fixed salt/IV, so encrypting the same plaintext always produces the
// same ciphertext — this lets us do `field: encryptForExactMatch(searchTerm)` lookups
// without ever decrypting stored data.
const ALGORITHM = 'aes-256-cbc';
const FIXED_IV = Buffer.from('1234567890123456');

const getSecret = () => {
    const raw = process.env.ENCRYPTION_KEY || 'default_insecure_development_key_32_bytes!';
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
};

export const encryptForExactMatch = (clearText: string): string => {
    const cipher = crypto.createCipheriv(ALGORITHM, getSecret(), FIXED_IV);
    const encrypted = Buffer.concat([cipher.update(clearText, 'utf8'), cipher.final()]);
    return FIXED_IV.toString('hex') + ':' + encrypted.toString('hex');
};
