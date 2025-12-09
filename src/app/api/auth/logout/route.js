import { prisma } from '@/lib/prisma';
import { hashRefreshToken } from '@/lib/jwt';

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

    // Find and revoke the token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { hashedToken },
    });

    if (storedToken) {
      // Mark token as revoked
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    return Response.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
