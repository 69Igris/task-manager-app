import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-access-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-secret-refresh-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Sign an access token
 * @param {string} userId - User ID
 * @returns {string} Access token
 */
export function signAccessToken(userId) {
  return jwt.sign(
    { userId },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Verify an access token
 * @param {string} token - Access token to verify
 * @returns {object|null} Decoded token or null if invalid
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    console.error('Access token verification failed:', error.message);
    return null;
  }
}

/**
 * Generate a refresh token and hash it
 * @returns {object} { token: string, hashedToken: string, expiresAt: Date }
 */
export function generateRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Refresh token expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  return {
    token,
    hashedToken,
    expiresAt,
  };
}

/**
 * Hash a refresh token
 * @param {string} token - Refresh token to hash
 * @returns {string} Hashed token
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify refresh token against hash
 * @param {string} token - Refresh token
 * @param {string} hashedToken - Hashed token from DB
 * @returns {boolean}
 */
export function verifyRefreshTokenHash(token, hashedToken) {
  return hashRefreshToken(token) === hashedToken;
}
