import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'paperino-data';

const WORD_LIST = [
  'algorithm', 'binary', 'compiler', 'database', 'encrypt',
  'function', 'gateway', 'hardware', 'integer', 'javascript',
  'kernel', 'library', 'malware', 'network', 'optimize',
  'protocol', 'quantum', 'runtime', 'software', 'terminal',
  'unicode', 'virtual', 'webpack', 'syntax', 'boolean',
  'variable', 'iterate', 'modular', 'parsing', 'graphic',
  'machine', 'digital', 'storage', 'compute', 'encrypt',
  'browser', 'silicon', 'circuit', 'deploy', 'python',
  'tensor', 'neural', 'server', 'docker', 'devops',
  'kotlin', 'github', 'struct', 'lambda', 'cursor'
];

function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let authUser;
    try {
      authUser = await verifyServerAuth(authHeader);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!authUser || !authUser.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = authUser;
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { sessionId, gameData } = body;
    if (!sessionId || !gameData) {
      return NextResponse.json({ error: 'Missing sessionId or gameData' }, { status: 400 });
    }

    const sessionUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/challenge_sessions/${sessionId}`;
    const sessionRes = await fetch(sessionUrl, {
      headers: { 'Authorization': authHeader }
    });

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionDoc = await sessionRes.json();
    const fields = sessionDoc.fields || {};
    
    const sessionUserId = fields.userId?.stringValue;
    const gameId = fields.gameId?.stringValue;
    const challengeDate = fields.challengeDate?.stringValue;
    const weekId = fields.weekId?.stringValue;
    const status = fields.status?.stringValue;
    const startedAt = fields.startedAt?.timestampValue;
    const isOfficial = fields.isOfficial?.booleanValue ?? false;

    if (sessionUserId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (status !== 'in_progress') {
      return NextResponse.json({ error: 'Session already completed or invalid' }, { status: 409 });
    }

    const seedNum = getSeed(`${gameId}-${challengeDate}`);
    const rand = mulberry32(seedNum);

    let score = 0;
    
    if (gameId === 'code-breaker') {
      const code = [];
      const digits = [0,1,2,3,4,5,6,7];
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rand() * digits.length);
        code.push(digits[idx]);
        digits.splice(idx, 1);
      }
      
      const { attempts = [], finalGuess = [] } = gameData;
      const isCorrect = code.join('') === finalGuess.join('');
      if (isCorrect) {
        const attemptsUsed = attempts.length;
        const maxAttempts = 10;
        score = Math.max(0, (maxAttempts - attemptsUsed) * 100);
      }
    } else if (gameId === 'memory-matrix') {
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const pattern: string[] = [];
        const numCells = 3 + r;
        while (pattern.length < numCells) {
          const rRow = Math.floor(rand() * 4);
          const rCol = Math.floor(rand() * 4);
          const cellStr = `${rRow},${rCol}`;
          if (!pattern.includes(cellStr)) {
            pattern.push(cellStr);
          }
        }
        rounds.push(pattern);
      }
      
      const userRounds = gameData.rounds || [];
      let totalCorrect = 0;
      for (let r = 0; r < 5; r++) {
        const correctPattern = rounds[r] || [];
        const userPattern = (userRounds[r]?.selected || []).map((c: number[]) => `${c[0]},${c[1]}`);
        userPattern.forEach((cell: string) => {
          if (correctPattern.includes(cell)) {
            totalCorrect++;
          }
        });
      }
      score = totalCorrect * 10;
    } else if (gameId === 'impossible-room') {
      const clues: string[] = [];
      for (let i = 0; i < 5; i++) {
        clues.push(`clue-${Math.floor(rand() * 1000)}`);
      }
      const lockCode = Array.from({length: 4}, () => Math.floor(rand() * 10)).join('');
      
      const { cluesFound = [], lockCode: userLockCode = '' } = gameData;
      let validClues = 0;
      cluesFound.forEach((c: string) => {
        if (clues.includes(c)) validClues++;
      });
      score = validClues * 200 + (userLockCode === lockCode ? 500 : 0);
    } else if (gameId === 'word-forge') {
      const correctAnswers: string[] = [];
      for (let r = 0; r < 6; r++) {
        const wordIdx = Math.floor(rand() * WORD_LIST.length);
        correctAnswers.push(WORD_LIST[wordIdx]);
      }
      
      const userAnswers = gameData.answers || [];
      let correct = 0;
      userAnswers.forEach((ans: string, idx: number) => {
        if (ans.toLowerCase() === correctAnswers[idx]) {
          correct++;
        }
      });
      score = correct * 150;
    }

    const now = new Date();
    const completedAt = now.toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    // Update session
    const updateSessionUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/challenge_sessions/${sessionId}?updateMask.fieldPaths=status`;
    const updateSessionFields = {
      fields: {
        ...fields,
        status: { stringValue: 'completed' }
      }
    };
    
    await fetch(updateSessionUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateSessionFields)
    });

    // Get user profile
    const userUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const userRes = await fetch(userUrl, {
      headers: { 'Authorization': authHeader }
    });
    
    let displayName = 'Unknown';
    let paperinoAvatar = '';
    
    if (userRes.ok) {
      const userDoc = await userRes.json();
      const userFields = userDoc.fields || {};
      displayName = userFields.displayName?.stringValue || 'Unknown';
      paperinoAvatar = userFields.paperinoAvatar?.stringValue || '';
    }

    // Create result
    const resultDocId = `${sessionId}-res`;
    const resultUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/challenge_results?documentId=${resultDocId}`;
    
    const resultFields = {
      fields: {
        userId: { stringValue: uid },
        displayName: { stringValue: displayName },
        paperinoAvatar: { stringValue: paperinoAvatar },
        gameId: { stringValue: gameId },
        challengeDate: { stringValue: challengeDate },
        weekId: { stringValue: weekId },
        startedAt: { timestampValue: startedAt },
        completedAt: { timestampValue: completedAt },
        durationMs: { integerValue: durationMs.toString() },
        score: { integerValue: score.toString() },
        isOfficial: { booleanValue: isOfficial },
        createdAt: { timestampValue: completedAt }
      }
    };

    await fetch(resultUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resultFields)
    });

    // Query leaderboard (Top 10)
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'challenge_results' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'gameId' }, op: 'EQUAL', value: { stringValue: gameId } } },
              { fieldFilter: { field: { fieldPath: 'weekId' }, op: 'EQUAL', value: { stringValue: weekId } } },
              { fieldFilter: { field: { fieldPath: 'isOfficial' }, op: 'EQUAL', value: { booleanValue: true } } }
            ]
          }
        },
        orderBy: [
          { field: { fieldPath: 'score' }, direction: 'DESCENDING' },
          { field: { fieldPath: 'durationMs' }, direction: 'ASCENDING' }
        ],
        limit: 10
      }
    };

    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryBody)
    });

    const leaderboard = [];
    if (queryRes.ok) {
      const qResult = await queryRes.json();
      if (Array.isArray(qResult)) {
        for (const item of qResult) {
          if (item.document && item.document.fields) {
            const f = item.document.fields;
            leaderboard.push({
              userId: f.userId?.stringValue,
              displayName: f.displayName?.stringValue,
              paperinoAvatar: f.paperinoAvatar?.stringValue,
              score: parseInt(f.score?.integerValue || '0', 10),
              durationMs: parseInt(f.durationMs?.integerValue || '0', 10)
            });
          }
        }
      }
    }

    // Since we don't know the exact rank without querying all results above the user,
    // we'll approximate rank or check if they are in top 10.
    const rankIndex = leaderboard.findIndex(r => r.userId === uid);
    let rank = rankIndex !== -1 ? rankIndex + 1 : -1;

    // If rank == -1, theoretically we should count all users with score > user_score OR (score == user_score AND durationMs < user_durationMs)
    if (rank === -1 && isOfficial) {
       const rankQueryBody = {
        structuredQuery: {
          from: [{ collectionId: 'challenge_results' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: 'gameId' }, op: 'EQUAL', value: { stringValue: gameId } } },
                { fieldFilter: { field: { fieldPath: 'weekId' }, op: 'EQUAL', value: { stringValue: weekId } } },
                { fieldFilter: { field: { fieldPath: 'isOfficial' }, op: 'EQUAL', value: { booleanValue: true } } },
                { fieldFilter: { field: { fieldPath: 'score' }, op: 'GREATER_THAN', value: { integerValue: score.toString() } } }
              ]
            }
          },
          select: { fields: [{ fieldPath: 'userId' }] } // Count aggregation is not fully available in REST easily without aggregations, we'll just fetch or skip
        }
      };
      
      const rankQueryRes = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rankQueryBody)
      });
      
      if (rankQueryRes.ok) {
         const rqResult = await rankQueryRes.json();
         let higherScoresCount = 0;
         if (Array.isArray(rqResult)) {
             higherScoresCount = rqResult.filter(r => r.document).length;
         }
         rank = higherScoresCount + 1; // Simplification, ignoring ties
      }
    }

    return NextResponse.json({
      success: true,
      score,
      durationMs,
      completedAt,
      rank,
      leaderboard,
      isOfficial
    });
  } catch (error) {
    console.error('challenge-submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
