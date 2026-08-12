import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import crypto from 'crypto';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'paperino-data';
const VALID_GAMES = ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge'];

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

function getISOWeekId(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

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

    const { gameId } = body;

    if (!gameId || !VALID_GAMES.includes(gameId)) {
      return NextResponse.json({ error: 'Invalid gameId' }, { status: 400 });
    }

    const now = new Date();
    const challengeDate = now.toISOString().split('T')[0];
    const weekId = getISOWeekId(now);
    
    const settingsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/weeklyChallenges`;
    const settingsRes = await fetch(settingsUrl, {
      headers: { 'Authorization': authHeader }
    });
    
    if (!settingsRes.ok) {
      // Allow fallback if settings doc doesn't exist, for the sake of the challenge.
      // But typically we should fail or use defaults. Let's assume defaults if not found.
    } else {
      const settingsDoc = await settingsRes.json();
      const fields = settingsDoc.fields || {};
      const enabled = fields.enabled?.booleanValue ?? true;
      if (!enabled) {
        return NextResponse.json({ error: 'Weekly challenges are currently disabled' }, { status: 403 });
      }
      
      const activeGames = fields.activeGames?.arrayValue?.values?.map((v: any) => v.stringValue) || [];
      if (activeGames.length > 0 && !activeGames.includes(gameId)) {
        return NextResponse.json({ error: 'This game is not currently active' }, { status: 403 });
      }
      
      const dayNum = now.getDay(); // 0-6
      const availableDays = fields.availableDays?.arrayValue?.values?.map((v: any) => Number(v.integerValue)) || [];
      if (availableDays.length > 0 && !availableDays.includes(dayNum)) {
        return NextResponse.json({ error: 'Challenges are not available today' }, { status: 403 });
      }
    }

    const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'challenge_sessions' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } },
              { fieldFilter: { field: { fieldPath: 'gameId' }, op: 'EQUAL', value: { stringValue: gameId } } },
              { fieldFilter: { field: { fieldPath: 'challengeDate' }, op: 'EQUAL', value: { stringValue: challengeDate } } },
              { fieldFilter: { field: { fieldPath: 'isOfficial' }, op: 'EQUAL', value: { booleanValue: true } } }
            ]
          }
        },
        limit: 1
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

    if (!queryRes.ok) {
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    const queryResult = await queryRes.json();
    let isOfficial = true;
    if (Array.isArray(queryResult) && queryResult.length > 0 && queryResult[0].document) {
      const docFields = queryResult[0].document.fields || {};
      const status = docFields.status?.stringValue;
      if (status === 'in_progress' || status === 'completed') {
        isOfficial = false;
      }
    }

    const sessionId = crypto.randomUUID();
    const startedAt = now.toISOString();

    const createDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/challenge_sessions?documentId=${sessionId}`;
    const sessionFields = {
      fields: {
        userId: { stringValue: uid },
        gameId: { stringValue: gameId },
        challengeDate: { stringValue: challengeDate },
        weekId: { stringValue: weekId },
        startedAt: { timestampValue: startedAt },
        status: { stringValue: 'in_progress' },
        isOfficial: { booleanValue: isOfficial },
        createdAt: { timestampValue: startedAt }
      }
    };

    const createRes = await fetch(createDocUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionFields)
    });

    if (!createRes.ok) {
      return NextResponse.json({ error: 'Failed to create challenge session' }, { status: 500 });
    }

    const seedNum = getSeed(`${gameId}-${challengeDate}`);
    const rand = mulberry32(seedNum);

    let puzzleData: any = {};

    if (gameId === 'code-breaker') {
      puzzleData = { numDigits: 4, range: [0, 7] };
    } else if (gameId === 'memory-matrix') {
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const pattern: string[] = [];
        const numCells = 3 + r; // Increases difficulty
        const totalCells = 16; // 4x4
        while (pattern.length < numCells) {
          const rRow = Math.floor(rand() * 4);
          const rCol = Math.floor(rand() * 4);
          const cellStr = `${rRow},${rCol}`;
          if (!pattern.includes(cellStr)) {
            pattern.push(cellStr);
          }
        }
        rounds.push({ pattern: pattern.map(s => s.split(',').map(Number)) });
      }
      puzzleData = { rounds };
    } else if (gameId === 'impossible-room') {
      const roomElements = [
        { id: 'desk', name: 'Desk' },
        { id: 'painting', name: 'Painting' },
        { id: 'bookshelf', name: 'Bookshelf' },
        { id: 'safe', name: 'Safe' },
        { id: 'rug', name: 'Rug' }
      ];
      puzzleData = { roomElements };
    } else if (gameId === 'word-forge') {
      const rounds = [];
      for (let r = 0; r < 6; r++) {
        const wordIdx = Math.floor(rand() * WORD_LIST.length);
        const word = WORD_LIST[wordIdx];
        const chars = word.split('');
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        rounds.push({ scrambled: chars.join(''), length: word.length });
      }
      puzzleData = { rounds };
    }

    return NextResponse.json({
      sessionId,
      gameId,
      challengeDate,
      weekId,
      isOfficial,
      puzzleData
    });
  } catch (error) {
    console.error('challenge-start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
