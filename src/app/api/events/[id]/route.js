import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// DELETE /api/events/[id] - Delete an event
export async function DELETE(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id } = await params;
    console.log('Deleting event with ID:', id, 'by user:', user.id);

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
    });

    console.log('Event found:', event);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (event.createdBy !== user.id) {
      console.log('Permission denied: event createdBy:', event.createdBy, 'user id:', user.id);
      return NextResponse.json(
        { error: 'You can only delete events you created' },
        { status: 403 }
      );
    }

    // Delete the event
    await prisma.event.delete({
      where: { id },
    });

    console.log('Event deleted successfully');
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event - Full error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    return NextResponse.json({ 
      error: 'Failed to delete event',
      details: error.message 
    }, { status: 500 });
  }
}
