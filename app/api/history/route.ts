import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { dbConnect } from '@/lib/db/mongoose';

export const dynamic = 'force-dynamic';
import UserHistoryEntry from '@/lib/db/models/UserHistoryEntry';
import ResearchResult from '@/lib/db/models/ResearchResult'; // Needed to register the schema for population

// Reference model to prevent tree-shaking and register schema in Mongoose
const _unusedResearchResult = ResearchResult;

export async function GET(request: Request) {
  // 1. Verify Authorization Header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid token' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  let userId: string;

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials are not configured on the server.' },
        { status: 500 }
      );
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;
  } catch (err: any) {
    console.error('Token verification failed:', err);
    return NextResponse.json(
      { error: `Unauthorized: Token verification failed: ${err.message || err}` },
      { status: 401 }
    );
  }

  // 2. Fetch User History or Specific Result
  const { searchParams } = new URL(request.url);
  const resultId = searchParams.get('resultId');

  try {
    await dbConnect();

    if (resultId) {
      const result = await ResearchResult.findOne({ _id: resultId, requestedBy: userId });
      if (!result) {
        return NextResponse.json({ error: 'Research result not found or access denied' }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    // Query entries and populate the linked ResearchResult schema details
    const historyEntries = await UserHistoryEntry.find({ userId })
      .sort({ viewedAt: -1 })
      .populate('resultId')
      .exec();

    // Format list for presentation in the sidebar
    const formattedHistory = historyEntries
      .map((entry) => {
        const result = entry.resultId as any;
        if (!result) return null; // Filter out entries where the parent research was deleted

        return {
          id: entry._id,
          resultId: result._id,
          companyName: result.canonicalEntity?.name || result.companyName || 'Unknown Company',
          ticker: result.canonicalEntity?.ticker || null,
          verdict: result.verdict?.verdict || 'PASS',
          confidence: result.verdict?.confidence || 0,
          viewedAt: entry.viewedAt,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ history: formattedHistory });
  } catch (dbErr: any) {
    console.error('Failed to fetch user history from database:', dbErr);
    return NextResponse.json(
      { error: `Database error: Failed to retrieve history: ${dbErr.message || dbErr}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // 1. Verify Authorization Header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid token' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  let userId: string;

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials are not configured.' },
        { status: 500 }
      );
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Unauthorized: Token verification failed: ${err.message || err}` },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    await dbConnect();

    if (id) {
      // Delete specific history entry
      const deleted = await UserHistoryEntry.findOneAndDelete({ _id: id, userId });
      if (!deleted) {
        return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deletedId: id });
    } else {
      // Delete all history entries for this user
      await UserHistoryEntry.deleteMany({ userId });
      return NextResponse.json({ success: true, cleared: true });
    }
  } catch (err: any) {
    console.error('Failed to delete history:', err);
    return NextResponse.json(
      { error: `Failed to delete history: ${err.message || err}` },
      { status: 500 }
    );
  }
}
