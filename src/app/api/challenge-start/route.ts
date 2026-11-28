import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { getCanonicalChallengeId } from '@/lib/challengeResolver';
import { isChallengeScheduleActive } from '@/lib/challengeUtils';
import { 
  BUG_HUNTER_POOL, 
  NUMBER_DETECTIVE_POOL, 
  LOGIC_MASTER_POOL, 
  CODE_BREAKER_POOL, 
  CIRCUIT_CHALLENGES, 
  MEMORY_RUSH_CARDS, 
  TYPING_BLITZ_SNIPPETS,
  WORD_LIST,
  IMPOSTOR_SCENARIOS,
  PARADOX_CHAINS,
  pickSeededQuestions 
} from '@/lib/arenaPuzzles';
import { getLeaderboard as buildLeaderboard } from '@/lib/challengeLeaderboard';

const VALID_GAMES = [
  'bug-hunter',
  'memory-rush',
  'typing-blitz',
  'number-detective',
  'logic-master',
  'code-breaker',
  'circuit-master',
  'memory-matrix',
  'impossible-room',
  'word-forge',
  'target-number',
  'memory-heist',
  'the-impostor',
  'paradox'
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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Auth header missing' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { gameId, checkOnly } = body;
    if (!gameId || !VALID_GAMES.includes(gameId)) {
      return NextResponse.json({ error: 'Invalid gameId parameter' }, { status: 400 });
    }

    const now = new Date();
    const challengeDate = now.toISOString().split('T')[0];
    const weekId = getISOWeekId(now);

    // Verify auth and config in parallel
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

    // Resolve canonical challengeId using admin config (or fallback)
    const challengeId = await getCanonicalChallengeId(gameId, authUser);
    const cfg = (configSnap && configSnap.exists) ? (configSnap.data() || {}) : {};

    if (configSnap && configSnap.exists) {
      if (cfg.enabled === false) {
        return NextResponse.json({ error: 'Weekly challenges are currently disabled' }, { status: 403 });
      }
      if (cfg.maintenanceMode === true) {
        return NextResponse.json({ error: 'Weekly challenges are currently under maintenance' }, { status: 403 });
      }
      if (cfg.activeGames && Array.isArray(cfg.activeGames) && !cfg.activeGames.includes(gameId)) {
        return NextResponse.json({ error: 'This game is currently disabled by admin' }, { status: 403 });
      }
      if (!isChallengeScheduleActive(cfg.availableDays, cfg.openTime, cfg.closeTime, now)) {
        return NextResponse.json({ error: 'Weekly challenges are not available at this time' }, { status: 403 });
      }
    }

    const maxAttempts = Number(cfg.officialAttempts) || 1;

    // Check existing official results to determine official attempt vs practice replay
    let prevResult: any = null;
    const deterministicResultDocId = `${challengeId}-${uid}-res`;

    if (adminDb) {
      try {
        if (maxAttempts > 1) {
          const sessionsSnap = await adminDb.collection("challenge_sessions")
            .where("userId", "==", uid)
            .where("challengeId", "==", challengeId)
            .where("status", "==", "completed")
            .get();

          if (sessionsSnap.size >= maxAttempts) {
            const lastSession = sessionsSnap.docs[sessionsSnap.docs.length - 1].data();
            prevResult = {
              score: lastSession.score || 50,
              durationMs: lastSession.durationMs || 0
            };
          }
        } else {
          const directDoc = await adminDb.collection("challenge_results").doc(deterministicResultDocId).get();
          if (directDoc.exists) {
            prevResult = directDoc.data();
          }

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
        }
      } catch (err) {
        console.warn("[challenge-start] Attempt check warning:", err);
      }
    }

    const wasAlreadyCompleted = Boolean(prevResult);
    const isOfficial = !wasAlreadyCompleted;

    // If client is only probing attempt status on mount (without starting game)
    if (checkOnly) {
      let leaderboard: any[] = [];
      let userRank: number | null = null;
      if (wasAlreadyCompleted) {
        const lbData = await buildLeaderboard(challengeId, uid);
        leaderboard = lbData.leaderboard;
        userRank = lbData.userRank;
      }
      return NextResponse.json({
        gameId,
        challengeId,
        isOfficial,
        wasAlreadyCompleted,
        score: prevResult?.score || 0,
        durationMs: prevResult?.durationMs || 0,
        rank: userRank || 1,
        leaderboard
      });
    }

    // High-entropy unique per-session seed ensures every new attempt gets fresh, non-repetitive puzzles
    const randomSeedBytes = crypto.randomBytes(4).readUInt32BE(0);
    const sessionSeed = (randomSeedBytes & 0x7FFFFFFF) || (Date.now() ^ Math.floor(Math.random() * 1000000));
    const rand = mulberry32(sessionSeed);

    let sessionId: string = crypto.randomUUID();
    let puzzleData: any = {};
    let sessionMeta: Record<string, any> = {};

    // Generate fresh puzzle data according to game type
    if (gameId === 'bug-hunter') {
      const questions = pickSeededQuestions(BUG_HUNTER_POOL, 5, sessionSeed).map(q => ({
        id: q.id,
        category: q.category,
        question: q.question,
        codeSnippet: q.codeSnippet,
        options: q.options
      }));
      puzzleData = { questions };
      sessionMeta = { questionIds: questions.map(q => q.id) };
    } else if (gameId === 'number-detective') {
      const questions = pickSeededQuestions(NUMBER_DETECTIVE_POOL, 5, sessionSeed).map(q => ({
        id: q.id,
        category: q.category,
        question: q.question,
        options: q.options
      }));
      puzzleData = { questions };
      sessionMeta = { questionIds: questions.map(q => q.id) };
    } else if (gameId === 'logic-master') {
      const questions = pickSeededQuestions(LOGIC_MASTER_POOL, 5, sessionSeed).map(q => ({
        id: q.id,
        category: q.category,
        question: q.question,
        options: q.options
      }));
      puzzleData = { questions };
      sessionMeta = { questionIds: questions.map(q => q.id) };
    } else if (gameId === 'code-breaker') {
      const questions = pickSeededQuestions(CODE_BREAKER_POOL, 5, sessionSeed).map(q => ({
        id: q.id,
        category: q.category,
        question: q.question,
        options: q.options
      }));
      puzzleData = { questions, numDigits: 4, range: [0, 7] };
      sessionMeta = { questionIds: questions.map(q => q.id) };
    } else if (gameId === 'circuit-master') {
      const selectedCircuits = pickSeededQuestions(CIRCUIT_CHALLENGES, 4, sessionSeed);
      const circuits = selectedCircuits.map(c => ({
        id: c.id,
        title: c.title,
        expression: c.expression,
        inputs: c.inputs,
        targetOutput: c.targetOutput
      }));
      puzzleData = { circuits };
      sessionMeta = { circuitIds: circuits.map(c => c.id) };
    } else if (gameId === 'memory-rush') {
      // Pick 8 unique pairs from the expanded 24-card tech pool
      const selectedCards = pickSeededQuestions(MEMORY_RUSH_CARDS, 8, sessionSeed);
      const deck = [...selectedCards, ...selectedCards].map((c, idx) => ({
        uid: `card-${idx}-${c.id}`,
        cardId: c.id,
        symbol: c.symbol,
        name: c.name,
        concept: c.concept
      }));
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      puzzleData = { deck };
      sessionMeta = { cardIds: selectedCards.map(c => c.id) };
    } else if (gameId === 'typing-blitz') {
      // Pick 3 unique code snippets from the 16-snippet pool
      const snippets = pickSeededQuestions(TYPING_BLITZ_SNIPPETS, 3, sessionSeed);
      puzzleData = { snippets };
      sessionMeta = { snippetIds: snippets.map(s => s.id) };
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
      // Dynamic random 4-digit code generated per session
      const d1 = 1 + Math.floor(rand() * 9);
      const d2 = 1 + Math.floor(rand() * 9);
      const d3 = 1 + Math.floor(rand() * 9);
      const d4 = 1 + Math.floor(rand() * 9);
      const masterCode = `${d1}${d2}${d3}${d4}`;
      const clueDetails = [
        { id: "wall-clock", digit: d1, pos: 1, hint: `1st Digit is ${d1}` },
        { id: "bookshelf", digit: d2, pos: 2, hint: `2nd Digit is ${d2}` },
        { id: "oil-painting", digit: d3, pos: 3, hint: `3rd Digit is ${d3}` },
        { id: "desk-lamp", digit: d4, pos: 4, hint: `4th Digit is ${d4}` },
      ];
      puzzleData = { masterCode, clueDetails };
      sessionMeta = { masterCode };
    } else if (gameId === 'word-forge') {
      // Pick 6 unique words from the expanded 150+ vocabulary pool
      const chosenWords = pickSeededQuestions(WORD_LIST, 6, sessionSeed);
      const rounds = chosenWords.map(word => {
        const chars = word.split('');
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return { scrambled: chars.join(''), length: word.length, original: word };
      });
      puzzleData = { rounds };
      sessionMeta = { words: chosenWords };
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
      const ITEMS = ['🔑', '📱', '💻', '📕', '🎧', '☕', '🖊️', '📷', '🔮', '💎', '⌚', '🕹️', '🛡️', '📦'];
      const gridSize = 3;
      const totalCells = gridSize * gridSize;
      const itemCount = 6;

      const itemPool = [...ITEMS];
      const chosenItems: string[] = [];
      for (let i = 0; i < itemCount; i++) {
        const idx = Math.floor(rand() * itemPool.length);
        chosenItems.push(itemPool[idx]);
        itemPool.splice(idx, 1);
      }

      const posPool = Array.from({ length: totalCells }, (_, i) => i);
      const chosenPositions: number[] = [];
      for (let i = 0; i < itemCount; i++) {
        const idx = Math.floor(rand() * posPool.length);
        chosenPositions.push(posPool[idx]);
        posPool.splice(idx, 1);
      }

      const grid: (string | null)[] = Array(totalCells).fill(null);
      chosenItems.forEach((item, i) => {
        grid[chosenPositions[i]] = item;
      });

      const rowNames = ['top', 'middle', 'bottom'];
      const colNames = ['left', 'center', 'right'];

      const posToLabel = (pos: number) => {
        const row = Math.floor(pos / gridSize);
        const col = pos % gridSize;
        return `${rowNames[row]}-${colNames[col]}`;
      };

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
      const questions: Array<{ question: string; options: string[]; correctAnswer: string }> = [
        { question: `Where was the ${q1Item}?`, options: q1Options, correctAnswer: correctLabel }
      ];

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
      sessionMeta = { questions };
    } else if (gameId === 'the-impostor') {
      // Pick 5 unique scenarios from the expanded 20-scenario pool
      const rounds = pickSeededQuestions(IMPOSTOR_SCENARIOS, 5, sessionSeed);
      puzzleData = { rounds };
      sessionMeta = { scenarios: rounds.map(r => r.answer) };
    } else if (gameId === 'paradox') {
      // Pick 5 unique instruction chains from the expanded 20-chain pool
      const rounds = pickSeededQuestions(PARADOX_CHAINS, 5, sessionSeed);
      puzzleData = { rounds };
      sessionMeta = { chains: rounds.map(r => r.answer) };
    }

    // Write session to Firestore
    if (adminDb) {
      const sessionData = {
        userId: uid,
        gameId,
        challengeDate,
        challengeId,
        weekId,
        sessionSeed,
        startedAt: admin.firestore.Timestamp.now(),
        status: 'in_progress',
        isOfficial,
        createdAt: admin.firestore.Timestamp.now(),
        ...sessionMeta
      };
      await adminDb.collection("challenge_sessions").doc(sessionId).set(sessionData).catch((dbErr: any) => {
        console.error("[challenge-start] session write failed:", dbErr.message);
      });
    } else {
      console.warn("[challenge-start] adminDb not initialized, using local simulation mode");
      sessionId = `local-fallback-${crypto.randomBytes(8).toString('hex')}`;
    }

    return NextResponse.json({
      sessionId,
      gameId,
      challengeDate,
      challengeId,
      weekId,
      isOfficial,
      wasAlreadyCompleted,
      puzzleData
    });
  } catch (error: any) {
    console.error('challenge-start uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
