import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/events - Get upcoming events
export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where = {};

    // Filter by date range
    if (startDate || endDate) {
      where.eventDate = {};
      if (startDate) where.eventDate.gte = new Date(startDate);
      if (endDate) where.eventDate.lte = new Date(endDate);
    } else {
      // Default: show only upcoming events
      where.eventDate = { gte: new Date() };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { eventDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events - Create a new event
export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const body = await request.json();
    const { title, description, eventDate } = body;

    if (!title || !eventDate) {
      return NextResponse.json(
        { error: 'Title and event date are required' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        eventDate: new Date(eventDate),
        createdBy: user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
