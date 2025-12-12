import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signAccessToken, generateRefreshToken } from '@/lib/jwt';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return Response.json(
        { error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = signAccessToken(user.id);
    const { token: refreshToken, hashedToken, expiresAt } = generateRefreshToken();

    // Store hashed refresh token in DB
    await prisma.refreshToken.create({
      data: {
        hashedToken,
        userId: user.id,
        expiresAt,
      },
    });

    return Response.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
