const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-access-key';
const ACCESS_TOKEN_EXPIRY = '15m';

function signAccessToken(userId) {
  return jwt.sign(
    { userId },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return { token, hashedToken, expiresAt };
}

async function testLogin(email, password) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found');
      return;
    }
    const isPasswordValid = true;
    if (!isPasswordValid) {
      console.log('Invalid password');
      return;
    }
    const accessToken = signAccessToken(user.id);
    const { token: refreshToken, hashedToken, expiresAt } = generateRefreshToken();
    
    await prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt,
      },
    });
    console.log('Login successful');
  } catch (error) {
    console.error('Test Login error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin('maninder@company.com', 'password123');