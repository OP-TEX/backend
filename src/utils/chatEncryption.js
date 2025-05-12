const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

// Secret key should be in environment variables (32 bytes for AES-256)
// IMPORTANT: Using a fixed fallback key for development - change in production!
const SECRET_KEY = process.env.CHAT_ENCRYPTION_KEY || '67566B59703373367639792442264529482B4D6251655468576D5A7134743777';
const IV_LENGTH = 16; // For AES, this is always 16 (because AES block size = 16 bytes) and should be random

/**
 * Encrypts a plaintext message using AES-256-CBC algorithm with a random IV.
 *
 * @param {string} message - The plaintext message to encrypt.
 * @returns {{ encryptedContent: string, iv: string }} - An object containing the encrypted content (hex)
 *                                                       and the initialization vector (hex) used for encryption.
 * @throws {Error} - Throws an error if encryption fails.
 */
const encryptMessage = (message) => {
    try {
        if (!message) {
            return { encryptedContent: '', iv: '' };
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(SECRET_KEY, 'hex'), iv);

        let encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
            encryptedContent: encrypted,
            iv: iv.toString('hex')
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt message');
    }
};

/**
 * Decrypts an encrypted message using AES-256-CBC with the provided IV.
 *
 * @param {string} encryptedContent - The encrypted message content (in hex format).
 * @param {string} iv - The initialization vector (in hex format) that was used during encryption.
 * @returns {string} - The original decrypted plaintext message.
 * @throws {Error} - Throws an error if decryption fails.
 */
const decryptMessage = (encryptedContent, iv) => {
    try {
        // Handle empty messages or missing encryption data
        if (!encryptedContent || !iv) {
            return '[Encrypted message unavailable]';
        }

        const decipher = crypto.createDecipheriv(
            algorithm,
            Buffer.from(SECRET_KEY, 'hex'),
            Buffer.from(iv, 'hex')
        );

        let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error, 'for content with IV:', iv?.substring(0, 10) + '...');
        return '[Could not decrypt message]';
    }
};

module.exports = {
    encryptMessage,
    decryptMessage
};