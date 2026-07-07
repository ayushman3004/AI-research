import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { dbConnect } from '@/lib/db/mongoose';
import ResearchResult from '@/lib/db/models/ResearchResult';
import UserHistoryEntry from '@/lib/db/models/UserHistoryEntry';
import { graph } from '@/lib/agent/graph';

export async function POST(request: Request) {
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

  // 2. Parse Request Body
  let body: { companyName?: string };
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const { companyName } = body;
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return NextResponse.json(
      { error: 'Company name is required' },
      { status: 400 }
    );
  }

  const normalizedCompany = companyName.trim().toLowerCase();

  // 3. Check MongoDB Cache
  let isDbConnected = false;
  let cachedResult = null;
  const ttlHours = parseInt(process.env.CACHE_TTL_HOURS || '24', 10);
  const cacheThreshold = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

  try {
    await dbConnect();
    isDbConnected = true;

    // Look for a result within the cache threshold
    cachedResult = await ResearchResult.findOne({
      companyName: normalizedCompany,
      createdAt: { $gte: cacheThreshold },
    });
  } catch (dbErr) {
    console.warn('MongoDB connection/query failed. Degrading gracefully (skipping cache check):', dbErr);
  }

  // 4. Cache Hit Flow
  if (cachedResult) {
    console.log(`Cache hit for "${normalizedCompany}". Skipping agent execution.`);
    
    // Log User History Entry (graceful fail on DB error)
    if (isDbConnected) {
      try {
        await UserHistoryEntry.create({
          userId,
          resultId: cachedResult._id,
          viewedAt: new Date(),
        });
      } catch (historyErr) {
        console.warn('Failed to record user history entry for cache hit:', historyErr);
      }
    }

    return NextResponse.json({
      cached: true,
      createdAt: cachedResult.createdAt,
      canonicalEntity: cachedResult.canonicalEntity,
      findings: cachedResult.findings,
      verdict: cachedResult.verdict,
    });
  }

  // 5. Cache Miss: Run LangGraph Agent
  console.log(`Cache miss for "${normalizedCompany}". Running LangGraph agent...`);
  let runResult;
  try {
    runResult = await graph.invoke({
      companyName: companyName.trim(),
    });

    if (runResult.error && !runResult.verdict) {
      return NextResponse.json(
        { error: runResult.error },
        { status: 500 }
      );
    }
  } catch (agentErr: any) {
    console.error('LangGraph execution failed:', agentErr);
    return NextResponse.json(
      { error: `Agent execution failed: ${agentErr.message || agentErr}` },
      { status: 500 }
    );
  }

  // 6. Persist Results & Record User History (with database degradation gracefulness)
  let savedResultId = null;
  if (isDbConnected) {
    try {
      const newResult = await ResearchResult.create({
        companyName: normalizedCompany,
        canonicalEntity: runResult.canonicalEntity,
        findings: runResult.findings,
        verdict: runResult.verdict,
        requestedBy: userId,
        createdAt: new Date(),
      });

      savedResultId = newResult._id;

      await UserHistoryEntry.create({
        userId,
        resultId: newResult._id,
        viewedAt: new Date(),
      });
      
      console.log(`Successfully persisted results and history for "${normalizedCompany}".`);
    } catch (saveErr) {
      console.warn('Failed to save research results to database. Skipping persistence:', saveErr);
    }
  }

  return NextResponse.json({
    cached: false,
    createdAt: new Date(),
    canonicalEntity: runResult.canonicalEntity,
    findings: runResult.findings,
    verdict: runResult.verdict,
  });
}
