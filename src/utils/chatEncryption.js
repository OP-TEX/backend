const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

// Secret key should be in environment variables (32 bytes for AES-256)
const SECRET_KEY = process.env.CHAT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
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
    // Define a function called encryptMessage that takes a plaintext message as input

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        // Generate a random Initialization Vector (IV) of length IV_LENGTH bytes (16 bytes for AES)
        // The IV adds randomness to ensure different ciphertexts for identical plaintexts

        const cipher = crypto.createCipheriv(algorithm, Buffer.from(SECRET_KEY, 'hex'), iv);
        // Create a Cipher object using the specified algorithm (like 'aes-256-cbc')
        // The secret key (in hex format) is converted to a buffer
        // The IV is passed to initialize the cipher properly

        let encrypted = cipher.update(message, 'utf8', 'hex');
        // Encrypt the plaintext message
        // Input encoding is 'utf8' (plaintext), output encoding is 'hex'
        // This encrypts the main chunk of the message

        encrypted += cipher.final('hex');
        // Finalize the encryption process and append any remaining encrypted bytes (in 'hex')
        // Ensures all data is processed and encryption is complete

        return {
            encryptedContent: encrypted,
            // Return an object containing the encrypted content as a hex string

            iv: iv.toString('hex')
            // Also return the IV used for encryption (converted to hex string for storage/transmission)
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
    // Define a function called decryptMessage that takes the encrypted content and IV as inputs

    try {
        const decipher = crypto.createDecipheriv(
            algorithm,
            Buffer.from(SECRET_KEY, 'hex'),
            Buffer.from(iv, 'hex')
        );
        // Create a Decipher object using the same algorithm (aes-256-cbc)
        // Convert the secret key from hex to a buffer
        // Convert the IV from hex to a buffer
        // These must exactly match what was used during encryption

        let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
        // Decrypt the encrypted content
        // Input encoding is 'hex' (because that's how it was stored)
        // Output encoding is 'utf8' (to get back the plaintext)

        decrypted += decipher.final('utf8');
        // Finalize the decryption and append any remaining decrypted bytes
        // Ensures all encrypted data is fully processed

        return decrypted;
        // Return the fully decrypted plaintext message

    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt message');
    }
};

module.exports = {
    encryptMessage,
    decryptMessage
};