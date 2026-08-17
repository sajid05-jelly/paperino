import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { getCanonicalChallengeId } from '@/lib/challengeResolver';

const VALID_GAMES = ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge', 'target-number', 'memory-heist', 'the-impostor', 'paradox'];


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

/**
 * Build the public Top 5 leaderboard + compute user rank from challenge_results.
 * Scoped to the EXACT challengeId (= gameId + admin session key).
 */
async function buildLeaderboard(challengeId: string, currentUid: string): Promise<{
  leaderboard: any[];
  userRank: number | null;
}> {
  const leaderboard: any[] = [];
  let userRank: number | null = null;

  if (!adminDb) return { leaderboard, userRank };

  try {
    const allResultsSnap = await adminDb.collection('challenge_results')
      .where('challengeId', '==', challengeId)
      .where('isOfficial', '==', true)
      .get();

    const userBestMap = new Map<string, any>();
    allResultsSnap.forEach((docSnap: any) => {
      const d = docSnap.data();
      const entry = {
        userId: d.userId,
        displayName: d.displayName || 'Anonymous',
        paperinoAvatar: d.paperinoAvatar || '',
        score: d.score || 0,
        durationMs: d.durationMs || 0,
        completedAt: d.completedAt ? (d.completedAt.toDate ? d.completedAt.toDate().getTime() : d.completedAt) : 0
      };
      if (!userBestMap.has(d.userId)) {
        userBestMap.set(d.userId, entry);
      } else {
        const existing = userBestMap.get(d.userId);
        if (entry.score > existing.score || (entry.score === existing.score && entry.durationMs < existing.durationMs)) {
          userBestMap.set(d.userId, entry);
        }
      }
    });

    const allEntries = Array.from(userBestMap.values());

    allEntries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
      return a.completedAt - b.completedAt;
    });

    allEntries.forEach((entry, idx) => {
      const rank = idx + 1;
      if (entry.userId === currentUid) {
        userRank = rank;
      }
      if (rank <= 3) {
        leaderboard.push({
          userId: entry.userId,
          displayName: entry.displayName,
          paperinoAvatar: entry.paperinoAvatar,
          score: entry.score,
          durationMs: entry.durationMs,
          rank
        });
      }
    });
  } catch (err: any) {
    console.warn("[buildLeaderboard] ranking query failed:", err.message);
  }

  return { leaderboard, userRank };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Auth header missing' }, { status: 401 });
    }

    // Parse body immediately (no await needed before auth)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { gameId } = body;
    if (!gameId || !VALID_GAMES.includes(gameId)) {
      return NextResponse.json({ error: 'Invalid gameId parameter' }, { status: 400 });
    }

    const now = new Date();
    const challengeDate = now.toISOString().split('T')[0];
    const weekId = getISOWeekId(now);

    // === PARALLEL BATCH 1: Auth + Config fetch at the same time ===
    const [authUser, configSnap] = await Promise.all([
      verifyServerAuth(authHeader).catch((e: any) => {
        console.error("[challenge-start] Token verification error:", e);
        return null;
      }),
      adminDb
        ? adminDb.collection("settings").doc("weeklyChallenges").get().catch(() => null)
        : Promise.resolve(null)
    ]);

    if (!authUser || !authUser.uid) {
      return NextResponse.json({ error: 'Unauthorized: User authentication required' }, { status: 401 });
    }

    const { uid } = authUser;

    // Process config
    let isOfficial = true;
    let isAdminBypass = false;
    // Determine admin bypass flag if config exists
    if (configSnap && configSnap.exists) {
      const cfg = configSnap.data() || {};
      const isUserAdmin = authUser.email?.toLowerCase() === "mohamedsajid.sa@gmail.com" || authUser.role === "admin" || (authUser as any).admin === true;
      isAdminBypass = Boolean(isUserAdmin && cfg.adminTestMode === true);
    }
    // Resolve canonical challengeId using admin config (or fallback)
    const challengeId = await getCanonicalChallengeId(gameId, authUser);

    if (configSnap && configSnap.exists) {
      const cfg = configSnap.data() || {};

      if (cfg.enabled === false && !isAdminBypass) {
        return NextResponse.json({ error: 'Weekly challenges are currently disabled' }, { status: 403 });
      }
      if (cfg.maintenanceMode === true && !isAdminBypass) {
        return NextResponse.json({ error: 'Weekly challenges are currently under maintenance' }, { status: 403 });
      }
      if (cfg.activeGames && Array.isArray(cfg.activeGames) && cfg.activeGames.length > 0 && !cfg.activeGames.includes(gameId) && !isAdminBypass) {
        return NextResponse.json({ error: 'This game is currently disabled by admin' }, { status: 403 });
      }
      if (cfg.availableDays && Array.isArray(cfg.availableDays) && cfg.availableDays.length > 0 && !cfg.availableDays.includes(now.getDay()) && !isAdminBypass) {
        return NextResponse.json({ error: 'Weekly challenges are not available today' }, { status: 403 });
      }
    }

    // === Check existing result for 1-attempt enforcement ===
    let sessionId: string = crypto.randomUUID();
    const deterministicResultDocId = `${challengeId}-${uid}-res`;

    if (isAdminBypass) {
      isOfficial = false;
    } else if (adminDb) {
      try {
        // Enforce ONE ATTEMPT per challengeId + userId
        // Step 1: Check deterministic doc directly (fastest, requires zero query index)
        const directDoc = await adminDb.collection("challenge_results").doc(deterministicResultDocId).get();
        let prevResult: any = directDoc.exists ? directDoc.data() : null;

        // Step 2: Fallback query if direct doc wasn't found (for legacy documents)
        if (!prevResult) {
          const existingResults = await adminDb.collection("challenge_results")
            .where("userId", "==", uid)
            .where("challengeId", "==", challengeId)
            .where("isOfficial", "==", true)
            .limit(1)
            .get();

          if (!existingResults.empty) {
            prevResult = existingResults.docs[0].data();
          }
        }

        // Step 3: Check completed session docs as secondary guard
        if (!prevResult) {
          const existingSession = await adminDb.collection("challenge_sessions")
            .where("userId", "==", uid)
            .where("challengeId", "==", challengeId)
            .where("status", "==", "completed")
            .limit(1)
            .get();

          if (!existingSession.empty) {
            const sData = existingSession.docs[0].data();
            prevResult = {
              score: sData.score || 50,
              durationMs: sData.durationMs || 0
            };
          }
        }

        if (prevResult) {
          const userScore = prevResult.score || 0;
          const userDuration = prevResult.durationMs || 0;

          // Build leaderboard scoped to this exact challengeId
          const { leaderboard, userRank } = await buildLeaderboard(challengeId, uid);

          return NextResponse.json({ 
            error: "You've already completed today's official challenge.", 
            completed: true,
            wasAlreadyCompleted: true,
            score: userScore,
            durationMs: userDuration,
            rank: userRank || 1,
            leaderboard,
            challengeId: challengeId
          }, { status: 409 });
        }
      } catch (err) {
        console.warn("[challenge-start] Attempt check warning:", err);
      }
    }

    // Write session to Firestore
    if (adminDb) {
      const sessionData = {
        userId: uid,
        gameId,
        challengeDate,
        challengeId,
        weekId,
        startedAt: admin.firestore.Timestamp.now(),
        status: 'in_progress',
        isOfficial,
        createdAt: admin.firestore.Timestamp.now()
      };
      await adminDb.collection("challenge_sessions").doc(sessionId).set(sessionData).catch((dbErr: any) => {
        console.error("[challenge-start] session write failed:", dbErr.message);
      });
    } else {
      console.warn("[challenge-start] adminDb not initialized, using local simulation mode");
      sessionId = `local-fallback-${crypto.randomBytes(8).toString('hex')}`;
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
        const numCells = 3 + r;
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
    } else if (gameId === 'target-number') {
      const OPERAND_POOL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25];
      const pickFromPool = (pool: number[]) => pool[Math.floor(rand() * pool.length)];

      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const availableNumbers: number[] = [];
        for (let i = 0; i < 6; i++) {
          availableNumbers.push(pickFromPool(OPERAND_POOL));
        }

        const useCount = 3 + Math.floor(rand() * 2); // 3 or 4
        let target = availableNumbers[0];
        const ops = ['+', '-', '*'];
        for (let i = 1; i < useCount; i++) {
          const op = ops[Math.floor(rand() * ops.length)];
          const n = availableNumbers[i];
          if (op === '+') target = target + n;
          else if (op === '-') target = Math.abs(target - n);
          else if (op === '*') target = target * n;
        }

        target = Math.max(1, Math.min(999, target));
        rounds.push({ target, availableNumbers, allowedOperators: ['+', '-', '*', '/'] });
      }

      puzzleData = { rounds };
    } else if (gameId === 'memory-heist') {
      // Generate a 3x3 grid with 6 items placed at random positions (seeded)
      const ITEMS = ['🔑', '📱', '💻', '📕', '🎧', '☕', '🖊️', '📷', '🔮'];
      const gridSize = 3;
      const totalCells = gridSize * gridSize;
      const itemCount = 6;

      // Pick 6 unique items from pool
      const itemPool = [...ITEMS];
      const chosenItems: string[] = [];
      for (let i = 0; i < itemCount; i++) {
        const idx = Math.floor(rand() * itemPool.length);
        chosenItems.push(itemPool[idx]);
        itemPool.splice(idx, 1);
      }

      // Assign to 6 unique positions in 3x3 grid
      const posPool = Array.from({ length: totalCells }, (_, i) => i);
      const chosenPositions: number[] = [];
      for (let i = 0; i < itemCount; i++) {
        const idx = Math.floor(rand() * posPool.length);
        chosenPositions.push(posPool[idx]);
        posPool.splice(idx, 1);
      }

      // Build grid: position -> item (null = empty)
      const grid: (string | null)[] = Array(totalCells).fill(null);
      chosenItems.forEach((item, i) => {
        grid[chosenPositions[i]] = item;
      });

      // Generate 3 questions from the actual grid state
      // Question types: (a) position of item, (b) item at position, (c) which row has item
      const questions: Array<{ question: string; options: string[]; correctAnswer: string }> = [];

      const rowNames = ['top', 'middle', 'bottom'];
      const colNames = ['left', 'center', 'right'];

      const posToLabel = (pos: number) => {
        const row = Math.floor(pos / gridSize);
        const col = pos % gridSize;
        return `${rowNames[row]}-${colNames[col]}`;
      };

      // Pre-calculate all deterministic indices before any sort() calls
      // because Array.sort() makes an unpredictable number of comparisons depending on the JS engine.
      const q1ItemIdx = Math.floor(rand() * itemCount);
      const q2ItemIdx = (q1ItemIdx + 1 + Math.floor(rand() * (itemCount - 1))) % itemCount;
      
      const q1WrongIndices = [Math.floor(rand() * (totalCells - 1)), Math.floor(rand() * (totalCells - 2)), Math.floor(rand() * (totalCells - 3))];
      const q2WrongIndices = [Math.floor(rand() * (itemCount - 1)), Math.floor(rand() * (itemCount - 2)), Math.floor(rand() * (itemCount - 3))];

      const q1Item = chosenItems[q1ItemIdx];
      const q1Pos = chosenPositions[q1ItemIdx];
      const correctLabel = posToLabel(q1Pos);
      
      const allLabels = Array.from({ length: totalCells }, (_, i) => posToLabel(i)).filter(l => l !== correctLabel);
      const wrongLabels: string[] = [];
      q1WrongIndices.forEach(wi => {
        const i = wi % allLabels.length;
        wrongLabels.push(allLabels[i]);
        allLabels.splice(i, 1);
      });
      const q1Options = [correctLabel, ...wrongLabels].sort(() => rand() - 0.5);
      questions.push({ question: `Where was the ${q1Item}?`, options: q1Options, correctAnswer: correctLabel });

      const q2Pos = chosenPositions[q2ItemIdx];
      const q2Label = posToLabel(q2Pos);
      const q2Correct = chosenItems[q2ItemIdx];
      
      const allWrongItems = chosenItems.filter(it => it !== q2Correct);
      const wrongItems: string[] = [];
      q2WrongIndices.forEach(wi => {
        const i = wi % allWrongItems.length;
        wrongItems.push(allWrongItems[i]);
        allWrongItems.splice(i, 1);
      });
      const q2Options = [q2Correct, ...wrongItems].sort(() => rand() - 0.5);
      questions.push({ question: `What was at the ${q2Label} position?`, options: q2Options, correctAnswer: q2Correct });

      const topRowCount = [0, 1, 2].filter(pos => grid[pos] !== null).length;
      const q3Options = ['0', '1', '2', '3'].sort(() => rand() - 0.5);
      questions.push({ question: 'How many items were in the top row?', options: q3Options, correctAnswer: String(topRowCount) });

      puzzleData = {
        grid,
        gridSize,
        items: chosenItems,
        questions,
        displaySeconds: 5,
      };
    } else if (gameId === 'the-impostor') {
      // Pre-validated scenario pool — every scenario has exactly one logical answer
      const SCENARIOS = [
        {
          characters: ['Arun', 'Bala', 'Cathy', 'David'],
          clues: ['Only one person likes both coffee and coding.', 'Arun likes coffee but not coding.', 'Bala likes coding but not coffee.', 'Cathy likes both coffee and coding.', 'David likes neither.'],
          question: 'Who likes both coffee and coding?',
          answer: 'Cathy',
          options: ['Arun', 'Bala', 'Cathy', 'David'],
        },
        {
          characters: ['Alice', 'Bob', 'Carol', 'Dan'],
          clues: ['Three people are telling the truth. One is lying.', 'Alice says: "I am in Room 1."', 'Bob says: "Alice is not in Room 1."', 'Carol says: "Bob is in Room 2."', 'Dan says: "Carol is telling the truth."'],
          question: 'Who is lying?',
          answer: 'Bob',
          options: ['Alice', 'Bob', 'Carol', 'Dan'],
        },
        {
          characters: ['Priya', 'Raj', 'Sam', 'Tina'],
          clues: ['Each person has a unique job: Doctor, Engineer, Artist, Chef.', 'Priya is not an Artist.', 'Raj is an Engineer.', 'Sam is not a Doctor.', 'Tina is an Artist.'],
          question: 'Who is the Doctor?',
          answer: 'Priya',
          options: ['Priya', 'Raj', 'Sam', 'Tina'],
        },
        {
          characters: ['Emma', 'Faisal', 'Grace', 'Hiro'],
          clues: ['One person scored 100 in the test.', 'Emma scored higher than Grace.', 'Faisal scored the lowest.', 'Hiro scored higher than Emma.', 'Only one person scored 100.'],
          question: 'Who scored 100?',
          answer: 'Hiro',
          options: ['Emma', 'Faisal', 'Grace', 'Hiro'],
        },
        {
          characters: ['Lena', 'Marco', 'Nina', 'Omar'],
          clues: ['One of them stole the key.', 'Lena was in the library all day.', 'Marco was with Lena.', 'Nina was seen near the key cabinet.', 'Omar was outside the building.'],
          question: 'Who stole the key?',
          answer: 'Nina',
          options: ['Lena', 'Marco', 'Nina', 'Omar'],
        },
        {
          characters: ['Kiran', 'Leo', 'Mia', 'Noah'],
          clues: ['Exactly one person sent the anonymous message.', 'Kiran has no email account.', 'Leo was offline that evening.', 'Mia sent a message at 8PM.', 'Noah was playing games.'],
          question: 'Who sent the anonymous message?',
          answer: 'Mia',
          options: ['Kiran', 'Leo', 'Mia', 'Noah'],
        },
        {
          characters: ['Aria', 'Ben', 'Cara', 'Dev'],
          clues: ['One person is the team leader.', 'Aria always follows orders.', 'Ben gives orders to Cara.', 'Cara follows Ben\'s orders.', 'Dev follows no one.'],
          question: 'Who is the team leader?',
          answer: 'Ben',
          options: ['Aria', 'Ben', 'Cara', 'Dev'],
        },
        {
          characters: ['Finn', 'Gina', 'Hugo', 'Iris'],
          clues: ['One person finished the puzzle first.', 'Finn finished after Gina.', 'Hugo finished before Iris.', 'Gina finished before Hugo.', 'Iris finished last.'],
          question: 'Who finished the puzzle first?',
          answer: 'Gina',
          options: ['Finn', 'Gina', 'Hugo', 'Iris'],
        },
      ];

      const pool = [...SCENARIOS];
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        if (pool.length === 0) break;
        const idx = Math.floor(rand() * pool.length);
        rounds.push({ ...pool[idx] });
        pool.splice(idx, 1);
      }
      puzzleData = { rounds };
    } else if (gameId === 'paradox') {
      // Pre-validated deterministic instruction chains with exactly one correct answer
      const CHAINS = [
        {
          values: [8, 3, 12, 5],
          instructions: [
            { text: 'Select the largest number.', active: true },
            { text: 'Ignore the previous instruction.', active: false },
            { text: 'Select the smallest number.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '3',
          options: ['8', '3', '12', '5'],
        },
        {
          values: [7, 2, 15, 9],
          instructions: [
            { text: 'Select the smallest number.', active: true },
            { text: 'Do exactly the opposite of the previous instruction.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '15',
          options: ['7', '2', '15', '9'],
        },
        {
          values: [4, 11, 6, 20],
          instructions: [
            { text: 'Select the largest number.', active: true },
            { text: 'Ignore all previous instructions.', active: false },
            { text: 'Select the number closest to 10.', active: true },
            { text: 'Keep the previous instruction.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '11',
          options: ['4', '11', '6', '20'],
        },
        {
          values: [1, 5, 9, 13],
          instructions: [
            { text: 'Select the number at position 3 (1-indexed).', active: true },
            { text: 'Discard the previous instruction.', active: false },
            { text: 'Select the even number.', active: false },
            { text: 'Select the number greater than 10.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '13',
          options: ['1', '5', '9', '13'],
        },
        {
          values: [6, 14, 3, 8],
          instructions: [
            { text: 'Select the odd number.', active: true },
            { text: 'Reverse the previous instruction — select an even number.', active: true },
            { text: 'Among even numbers, select the smallest.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '6',
          options: ['6', '14', '3', '8'],
        },
        {
          values: [10, 4, 7, 25],
          instructions: [
            { text: 'Select the number that is divisible by 5.', active: true },
            { text: 'Also consider numbers divisible by 2.', active: false },
            { text: 'Only the first active instruction matters.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '10',
          options: ['10', '4', '7', '25'],
        },
        {
          values: [2, 9, 16, 5],
          instructions: [
            { text: 'Select a prime number.', active: true },
            { text: 'Override: select a perfect square.', active: true },
            { text: 'The latest instruction overrides all.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '16',
          options: ['2', '9', '16', '5'],
        },
        {
          values: [3, 18, 7, 12],
          instructions: [
            { text: 'Select the number divisible by 3.', active: true },
            { text: 'Ignore this instruction.', active: false },
            { text: 'Among numbers divisible by 3, select the largest.', active: true },
          ],
          question: 'Which number should you select?',
          answer: '18',
          options: ['3', '18', '7', '12'],
        },
      ];

      const pool = [...CHAINS];
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        if (pool.length === 0) break;
        const idx = Math.floor(rand() * pool.length);
        rounds.push({ ...pool[idx] });
        pool.splice(idx, 1);
      }
      puzzleData = { rounds };
    }

    return NextResponse.json({
      sessionId,
      gameId,
      challengeDate,
      challengeId,
      weekId,
      isOfficial,
      puzzleData
    });
  } catch (error: any) {
    console.error('challenge-start uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
