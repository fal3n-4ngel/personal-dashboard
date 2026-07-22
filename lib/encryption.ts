import crypto from "crypto";

// AES-256-GCM configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

// Get or derive a 32-byte encryption key
function getEncryptionKey(useFallbackOnly: boolean = false): Buffer {
  const secret = useFallbackOnly ? null : process.env.ENCRYPTION_KEY;
  if (secret) {
    // If key is provided, hash it to ensure exactly 32 bytes
    return crypto.createHash("sha256").update(secret).digest();
  }
  
  // Fallback for local development using Firebase config key
  const fbConfig = process.env.FIREBASE_CONFIG || "fallback-secret-key-phrase";
  return crypto.createHash("sha256").update(fbConfig).digest();
}

/**
 * Encrypts a plain text string into a single serialized string: "iv:authTag:ciphertext"
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    return text; // Fallback to raw text to prevent service failure
  }
}

/**
 * Decrypts a serialized "iv:authTag:ciphertext" string back to plain text
 */
export function decrypt(encryptedText: string, useFallbackOnly: boolean = false): string {
  if (!encryptedText || !encryptedText.includes(":")) {
    // Return original if it doesn't look like our encrypted format (e.g. migration safety for old records)
    return encryptedText;
  }

  try {
    const key = getEncryptionKey(useFallbackOnly);
    const [ivHex, authTagHex, ciphertextHex] = encryptedText.split(":");
    
    if (!ivHex || !authTagHex || !ciphertextHex) {
      return encryptedText;
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    if (!useFallbackOnly && process.env.ENCRYPTION_KEY) {
      // If decryption failed using the main key, attempt to decrypt with the fallback key
      return decrypt(encryptedText, true);
    }
    // If decryption fails, return original
    console.warn("Decryption failed, returning raw string:", err);
    return encryptedText;
  }
}
