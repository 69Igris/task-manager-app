import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id } = await params;
    console.log('Deleting note with ID:', id, 'by user:', user.id);

    // Check if note exists
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (note.createdBy !== user.id) {
      console.log('Permission denied: note createdBy:', note.createdBy, 'user id:', user.id);
      return NextResponse.json(
        { error: 'You can only delete notes you created' },
        { status: 403 }
      );
    }

    // Delete the note
    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ 
      error: 'Failed to delete note',
      details: error.message 
    }, { status: 500 });
  }
}

// PATCH /api/notes/[id] - Update a note
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;

    const { id } = await params;
    const body = await request.json();
    const { title, items } = body;

    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (note.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'You can only update notes you created' },
        { status: 403 }
      );
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (items !== undefined) updateData.items = items;

    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}
