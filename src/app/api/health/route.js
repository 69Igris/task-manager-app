import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check if environment variables are set
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_ACCESS_SECRET: !!process.env.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: !!process.env.JWT_REFRESH_SECRET,
    };

    // Try to connect to database
    let dbStatus = 'disconnected';
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = `error: ${dbError.message}`;
    } finally {
      await prisma.$disconnect();
    }

    return NextResponse.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'unknown',
      envVariables: envCheck,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
