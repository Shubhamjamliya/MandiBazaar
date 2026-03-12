import crypto from 'crypto';

/**
 * Encrypts data for HDFC CCAvenue
 * CCAvenue uses AES-128-CBC encryption.
 * The init vector is a 16 byte string derived from HDFC's hashing implementation.
 * Standard CCAvenue encryption: md5 hash of the 32 byte working key is used for the key (which makes it 16 bytes for aes-128).
 * Usually CCAvenue provides a standard Node.js integration script.
 * 
 * In standard CCAvenue node integration:
 * Key is derived by md5 hashing the working key.
 * The IV is either standard (e.g. 16 byte zero vectors or derived).
 */

export const encrypt = (plainText: string, workingKey: string): string => {
    // Generate an MD5 hash of the working key to create a 16-byte buffer for the AES-128 key
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = m.digest();

    // The CCAvenue sample code usually uses an initialization vector (IV) of 16 bytes filled with \x00
    const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f'; // Standard CCAvenue IV
    
    // Create cipher using AES-128-CBC
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    
    // CCAvenue expects hex encoded encrypted request
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
};

export const decrypt = (encText: string, workingKey: string): string => {
    // Generate an MD5 hash of the working key to create a 16-byte buffer for the AES-128 key
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = m.digest();

    const iv = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f'; // Standard CCAvenue IV
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    
    // Verify auto padding behavior (CCAvenue node script leaves it at true)
    // decipher.setAutoPadding(true); 

    let decrypted = decipher.update(encText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
};
