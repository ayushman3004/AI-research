import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { dbConnect } from '@/lib/db/mongoose';
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

  // 2. Fetch User History
  try {
    await dbConnect();

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
