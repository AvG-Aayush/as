// Simple encryption utility for chat messages
// In production, use a proper encryption library like crypto-js

export function encryptMessage(message: string): string {
  // Simple base64 encoding for demo purposes
  // In production, use proper encryption
  try {
    return btoa(message);
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Fallback to plain text if encryption fails
  }
}

export function decryptMessage(encryptedMessage: string): string {
  // Simple base64 decoding for demo purposes
  // In production, use proper decryption
  try {
    return atob(encryptedMessage);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedMessage; // Fallback to original if decryption fails
  }
}