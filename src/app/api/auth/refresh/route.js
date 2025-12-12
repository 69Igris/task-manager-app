import { prisma } from '@/lib/prisma';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '@/lib/jwt';

export async function POST(request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return Response.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Hash the incoming token
    const hashedToken = hashRefreshToken(refreshToken);

    // Find the token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { hashedToken },
      include: { user: true },
    });

    if (!storedToken) {
      return Response.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      return Response.json(
        { error: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      return Response.json(
        { error: 'Refresh token has been revoked' },
        { status: 401 }
      );
    }

    // Delete old refresh token (rotation)
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const accessToken = signAccessToken(storedToken.user.id);
    const { 
      token: newRefreshToken, 
      hashedToken: newHashedToken, 
      expiresAt 
    } = generateRefreshToken();

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        hashedToken: newHashedToken,
        userId: storedToken.user.id,
        expiresAt,
      },
    });

    return Response.json(
      {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: storedToken.user.id,
          email: storedToken.user.email,
          name: storedToken.user.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
