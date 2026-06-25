import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Gets the encryption key from the environment.
 * If ENCRYPTION_KEY is not set, it throws an error in production,
 * or logs a warning and uses a fallback key in development (NOT RECOMMENDED).
 */
function getKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
     if (process.env.NODE_ENV === 'production') {
         throw new Error("ENCRYPTION_KEY is required in production for secure token storage.");
     } else {
         console.warn("[SECURITY WARNING] ENCRYPTION_KEY not set. Using insecure fallback key for development ONLY.");
         return crypto.scryptSync('insecure-dev-fallback-key', 'salt', 32);
     }
  }
  
  // Ensure the key is exactly 32 bytes for AES-256
  // If it's a hex string of length 64, parse it
  if (keyStr.length === 64 && /^[0-9a-f]+$/i.test(keyStr)) {
      return Buffer.from(keyStr, 'hex');
  }
  
  // Otherwise derive a 32 byte key using scrypt
  return crypto.scryptSync(keyStr, 'hirenest-salt', 32);
}

/**
 * Encrypts a string into a format containing IV, Auth Tag, and Ciphertext.
 * Format: iv.tag.ciphertext (all hex encoded)
 */
export function encryptText(text: string): string {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted}`;
  } catch (err) {
    console.error("[Encryption Error] Failed to encrypt:", err);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a string that was encrypted by encryptText.
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // If it doesn't look like our encrypted format, it might be legacy plaintext
  // or just malformed. We can attempt to split and if it doesn't have 3 parts,
  // return it as-is to support seamless migration of existing unencrypted tokens.
  const parts = encryptedText.split('.');
  if (parts.length !== 3) {
      console.warn("[Decryption Warning] Text does not appear to be encrypted (or is legacy). Returning as-is.");
      return encryptedText;
  }
  
  try {
    const [ivHex, tagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error("[Decryption Error] Failed to decrypt:", err);
    throw new Error("Decryption failed");
  }
}
