import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { 
  BUG_HUNTER_POOL, 
  NUMBER_DETECTIVE_POOL, 
  LOGIC_MASTER_POOL, 
  CODE_BREAKER_POOL, 
  CIRCUIT_CHALLENGES, 
  MEMORY_RUSH_CARDS, 
  TYPING_BLITZ_SNIPPETS,
  BUG_HUNTER_MAP,
  NUMBER_DETECTIVE_MAP,
  LOGIC_MASTER_MAP,
  CODE_BREAKER_MAP,
  CIRCUIT_MAP,
  IMPOSTOR_SCENARIOS,
  PARADOX_CHAINS,
  pickSeededQuestions,
  ReviewItem
} from '@/lib/arenaPuzzles';
import { getLeaderboard as buildLeaderboard, invalidateLeaderboardCache, invalidateWeeklyLeaderboardCache } from '@/lib/challengeLeaderboard';

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
      return NextResponse.json({ error: 'Unauthorized: Auth token required' }, { status: 401 });
    }

    let authUser;
    try {
      authUser = await verifyServerAuth(authHeader);
    } catch (e: any) {
      console.error('[challenge-submit] Auth error:', e);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    if (!authUser || !authUser.uid) {
      return NextResponse.json({ error: 'Unauthorized: User authentication failed' }, { status: 401 });
    }

    const { uid } = authUser;

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { sessionId, gameData } = body;

    if (!sessionId || !gameData) {
      return NextResponse.json({ error: 'Missing required parameters: sessionId or gameData' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server database connection failed' }, { status: 500 });
    }

    // Verify challenge arena is active and not disabled/in maintenance
    try {
      const configSnap = await adminDb.collection("settings").doc("weeklyChallenges").get();
      if (configSnap.exists) {
        const cfg = configSnap.data() || {};
        if (cfg.enabled === false) {
          return NextResponse.json({ error: 'Weekly challenges are currently disabled' }, { status: 403 });
        }
        if (cfg.maintenanceMode === true) {
          return NextResponse.json({ error: 'Weekly challenges are currently under maintenance' }, { status: 403 });
        }
      }
    } catch (cfgErr) {
      console.warn("[challenge-submit] config check warning:", cfgErr);
    }

    // 1. Fetch Session Doc from Firestore with graceful fallback
    const sessionDocRef = adminDb.collection('challenge_sessions').doc(sessionId);
    let sessionSnap: any = null;
    let isDbReadFailed = false;

    try {
      sessionSnap = await sessionDocRef.get();
    } catch (err: any) {
      console.warn("[challenge-submit] session retrieval error, attempting graceful resolution:", err.message);
      isDbReadFailed = true;
    }

    let gameId = '';
    let challengeDate = '';
    let challengeId = '';
    let weekId = '';
    let isOfficial = true;
    let sessionSeed: number | null = null;
    let startedAt: Date = new Date();
    const completedAt = new Date();
    let sessionQuestionIds: string[] | null = null;
    let sessionCircuitIds: string[] | null = null;
    let sessionSnippetIds: string[] | null = null;
    let sessionMasterCode: string | null = null;

    if (!isDbReadFailed && sessionSnap && sessionSnap.exists) {
      const session = sessionSnap.data() || {};

      if (session.userId !== uid) {
        return NextResponse.json({ error: 'Unauthorized session access' }, { status: 403 });
      }

      if (session.status !== 'in_progress') {
        return NextResponse.json({ error: 'Challenge session has already been completed' }, { status: 409 });
      }

      gameId = session.gameId;
      challengeDate = session.challengeDate;
      challengeId = session.challengeId || `${gameId}-${challengeDate}`;
      weekId = session.weekId;
      isOfficial = Boolean(session.isOfficial);
      sessionSeed = session.sessionSeed || null;
      sessionQuestionIds = session.questionIds || null;
      sessionCircuitIds = session.circuitIds || null;
      sessionSnippetIds = session.snippetIds || null;
      sessionMasterCode = session.masterCode || null;
      startedAt = session.startedAt ? (typeof session.startedAt.toDate === "function" ? session.startedAt.toDate() : new Date(session.startedAt)) : new Date();
    } else {
      gameId = body.gameData?.gameId || (body.gameData?.rounds ? 'memory-matrix' : 'code-breaker');
      const now = new Date();
      challengeDate = now.toISOString().split('T')[0];
      weekId = getISOWeekId(now);
      challengeId = `${gameId}-${challengeDate}`;
      const rawDuration = Number(gameData?.durationMs) || 15000;
      startedAt = new Date(completedAt.getTime() - rawDuration);
    }

    // Atomic double submission guard for official attempts
    const deterministicResultDocId = `${challengeId}-${uid}-res`;
    if (isOfficial) {
      try {
        const directDoc = await adminDb.collection("challenge_results").doc(deterministicResultDocId).get();
        if (directDoc.exists) {
          // Fall back gracefully to practice mode result if already submitted officially
          isOfficial = false;
        }
      } catch (err: any) {
        console.warn("[challenge-submit] Double-submit check warning:", err.message);
      }
    }

    // Compute duration from server timestamps
    const serverDurationMs = completedAt.getTime() - startedAt.getTime();
    const rawClientDuration = Number(gameData?.durationMs);
    let durationMs: number;

    if (serverDurationMs > 500) {
      durationMs = serverDurationMs;
    } else if (!isNaN(rawClientDuration) && rawClientDuration > 0) {
      durationMs = rawClientDuration;
    } else {
      durationMs = Math.max(1000, serverDurationMs);
    }

    // 2. Calculate score and review items server-side
    const seedNum = sessionSeed || getSeed(challengeId);
    let rand = mulberry32(seedNum);
    let correctnessRatio = 1.0;
    const reviewItems: ReviewItem[] = [];
    let correctCount = 0;
    let totalQuestions = 0;

    if (gameId === 'bug-hunter') {
      const questions = (sessionQuestionIds && sessionQuestionIds.length > 0)
        ? sessionQuestionIds.map(id => BUG_HUNTER_MAP.get(id)).filter(Boolean) as typeof BUG_HUNTER_POOL
        : pickSeededQuestions(BUG_HUNTER_POOL, 5, seedNum);

      totalQuestions = questions.length;
      const userAnswers = gameData?.userAnswers || {};
      questions.forEach((q, idx) => {
        const userAns = userAnswers[q.id] || userAnswers[idx];
        const isCorrect = userAns === q.correctAnswer;
        if (isCorrect) correctCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: q.question + (q.codeSnippet ? `\n\n\`\`\`\n${q.codeSnippet}\n\`\`\`` : ''),
          userAnswer: userAns || 'Not Answered',
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation,
          options: q.options,
          category: q.category
        });
      });
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    } else if (gameId === 'number-detective') {
      const questions = (sessionQuestionIds && sessionQuestionIds.length > 0)
        ? sessionQuestionIds.map(id => NUMBER_DETECTIVE_MAP.get(id)).filter(Boolean) as typeof NUMBER_DETECTIVE_POOL
        : pickSeededQuestions(NUMBER_DETECTIVE_POOL, 5, seedNum);

      totalQuestions = questions.length;
      const userAnswers = gameData?.userAnswers || {};
      questions.forEach((q, idx) => {
        const userAns = userAnswers[q.id] || userAnswers[idx];
        const isCorrect = userAns === q.correctAnswer;
        if (isCorrect) correctCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: q.question,
          userAnswer: userAns || 'Not Answered',
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation,
          options: q.options,
          category: q.category
        });
      });
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    } else if (gameId === 'logic-master') {
      const questions = (sessionQuestionIds && sessionQuestionIds.length > 0)
        ? sessionQuestionIds.map(id => LOGIC_MASTER_MAP.get(id)).filter(Boolean) as typeof LOGIC_MASTER_POOL
        : pickSeededQuestions(LOGIC_MASTER_POOL, 5, seedNum);

      totalQuestions = questions.length;
      const userAnswers = gameData?.userAnswers || {};
      questions.forEach((q, idx) => {
        const userAns = userAnswers[q.id] || userAnswers[idx];
        const isCorrect = userAns === q.correctAnswer;
        if (isCorrect) correctCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: q.question,
          userAnswer: userAns || 'Not Answered',
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation,
          options: q.options,
          category: q.category
        });
      });
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    } else if (gameId === 'code-breaker' && gameData?.userAnswers) {
      const questions = (sessionQuestionIds && sessionQuestionIds.length > 0)
        ? sessionQuestionIds.map(id => CODE_BREAKER_MAP.get(id)).filter(Boolean) as typeof CODE_BREAKER_POOL
        : pickSeededQuestions(CODE_BREAKER_POOL, 5, seedNum);

      totalQuestions = questions.length;
      const userAnswers = gameData.userAnswers;
      questions.forEach((q, idx) => {
        const userAns = userAnswers[q.id] || userAnswers[idx];
        const isCorrect = userAns === q.correctAnswer;
        if (isCorrect) correctCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: q.question,
          userAnswer: userAns || 'Not Answered',
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation,
          options: q.options,
          category: q.category
        });
      });
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    } else if (gameId === 'circuit-master') {
      const circuits = (sessionCircuitIds && sessionCircuitIds.length > 0)
        ? sessionCircuitIds.map(id => CIRCUIT_MAP.get(id)).filter(Boolean) as typeof CIRCUIT_CHALLENGES
        : pickSeededQuestions(CIRCUIT_CHALLENGES, 4, seedNum);

      const circuitInputs = gameData?.circuitInputs || {};
      totalQuestions = circuits.length;
      circuits.forEach((c, idx) => {
        const inputs = circuitInputs[c.id] || { A: 0, B: 0, C: 0 };
        const res = c.validate(inputs);
        if (res.isCorrect) correctCount++;
        const inputSummary = Object.entries(inputs).map(([k, v]) => `${k}=${v}`).join(', ');
        reviewItems.push({
          questionNumber: idx + 1,
          question: `${c.title} — Circuit: ${c.expression} (Target Output: ${c.targetOutput})`,
          userAnswer: `Switches: [${inputSummary}] -> Output: ${res.output}`,
          correctAnswer: `Target Output: ${c.targetOutput}`,
          isCorrect: res.isCorrect,
          explanation: c.explanation,
          category: 'Digital Logic'
        });
      });
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    } else if (gameId === 'memory-rush') {
      const totalMoves = Number(gameData?.totalMoves) || 16;
      const matchedCount = Number(gameData?.matchedPairsCount) || 8;
      totalQuestions = 8;
      correctCount = matchedCount;
      correctnessRatio = Math.min(1.0, Math.max(0.4, (8 / Math.max(8, totalMoves))));
      const cardsUsed = pickSeededQuestions(MEMORY_RUSH_CARDS, 8, seedNum);
      cardsUsed.forEach((card, idx) => {
        reviewItems.push({
          questionNumber: idx + 1,
          question: `Memory Card: ${card.name} (${card.symbol})`,
          userAnswer: `Matched successfully in ${totalMoves} total moves`,
          correctAnswer: `${card.name} — ${card.symbol}`,
          isCorrect: true,
          explanation: card.concept,
          category: 'Tech Stack Recall'
        });
      });
    } else if (gameId === 'typing-blitz') {
      const snippets = (sessionSnippetIds && sessionSnippetIds.length > 0)
        ? sessionSnippetIds.map(id => TYPING_BLITZ_SNIPPETS.find(s => s.id === id)).filter(Boolean) as typeof TYPING_BLITZ_SNIPPETS
        : pickSeededQuestions(TYPING_BLITZ_SNIPPETS, 3, seedNum);

      const snippetsTyped = Array.isArray(gameData?.snippetsTyped) ? gameData.snippetsTyped : [];
      totalQuestions = snippets.length;
      snippets.forEach((s, idx) => {
        const userItem = snippetsTyped.find((item: any) => item.id === s.id) || snippetsTyped[idx];
        const userTyped = userItem?.typed || '';
        const acc = Number(userItem?.accuracy) || 0;
        const wpm = Number(userItem?.wpm) || 0;
        const isCorrect = acc >= 75;
        if (isCorrect) correctCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: `Code Snippet: ${s.title} (${s.language})\nPrompt: "${s.code}"`,
          userAnswer: userTyped ? `Typed: "${userTyped}" (${acc}% accuracy, ${wpm} WPM)` : 'Not Answered',
          correctAnswer: s.code,
          isCorrect,
          explanation: `${s.explanation} (Speed: ${wpm} WPM, Accuracy: ${acc}%)`,
          category: s.language
        });
      });
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    } else if (gameId === 'impossible-room') {
      const clientCode = String(gameData?.lockCode || '');
      const isCodeCorrect = sessionMasterCode ? (clientCode === sessionMasterCode) : (clientCode.length === 4);
      correctnessRatio = isCodeCorrect ? 1.0 : 0.0;
      correctCount = isCodeCorrect ? 1 : 0;
      totalQuestions = 1;
      reviewItems.push({
        questionNumber: 1,
        question: "Master Safe Authorization Combination",
        userAnswer: clientCode || "None Entered",
        correctAnswer: sessionMasterCode || "4-Digit Code",
        isCorrect: isCodeCorrect,
        explanation: "Decrypt the 4 clue digits hidden in the room objects in order [1st..4th] to disarm the vault.",
        category: "Escape Room"
      });
    } else if (gameId === 'target-number') {
      const OPERAND_POOL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25];
      const pickFromPool = (pool: number[]) => pool[Math.floor(rand() * pool.length)];

      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const availableNumbers: number[] = [];
        for (let i = 0; i < 6; i++) { availableNumbers.push(pickFromPool(OPERAND_POOL)); }
        const useCount = 3 + Math.floor(rand() * 2);
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
        rounds.push({ target, availableNumbers });
      }

      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let cCount = 0;
      totalQuestions = rounds.length;
      
      rounds.forEach((round, idx) => {
        const expr = String(clientAnswers[idx] || '').replace(/\s/g, '');
        let isCorrect = false;
        if (expr && !/[^0-9+*/()-]/.test(expr)) {
          const numsInExpr = expr.split(/[^0-9]+/).filter(Boolean).map(Number);
          const used = [...round.availableNumbers];
          let validNums = true;
          for (const n of numsInExpr) {
            const i = used.indexOf(n);
            if (i === -1) { validNums = false; break; }
            used.splice(i, 1);
          }
          if (validNums) {
            try {
              const result = new Function('return ' + expr)();
              if (Math.abs(result - round.target) < 0.001) isCorrect = true;
            } catch(e) {}
          }
        }
        if (isCorrect) cCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: `Target: ${round.target} | Allowed numbers: [${round.availableNumbers.join(', ')}]`,
          userAnswer: expr || 'Not Answered',
          correctAnswer: `Valid equation reaching ${round.target}`,
          isCorrect,
          explanation: isCorrect ? `Successfully evaluated to target ${round.target}.` : `The target number was ${round.target}.`,
          category: 'Mental Arithmetic'
        });
      });
      correctCount = cCount;
      correctnessRatio = rounds.length > 0 ? (correctCount / rounds.length) : 1;
    } else if (gameId === 'the-impostor') {
      const rounds = pickSeededQuestions(IMPOSTOR_SCENARIOS, 5, seedNum);
      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let cCount = 0;
      totalQuestions = rounds.length;
      rounds.forEach((round, idx) => {
        const uAns = clientAnswers[idx];
        const isCorrect = uAns === round.answer;
        if (isCorrect) cCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: `${round.question}\n\nClues:\n${round.clues.map(c => '• ' + c).join('\n')}`,
          userAnswer: uAns || 'Not Answered',
          correctAnswer: round.answer,
          isCorrect,
          explanation: `Deductive rules confirm ${round.answer} is the true conclusion.`,
          options: round.options,
          category: 'Deductive Logic'
        });
      });
      correctCount = cCount;
      correctnessRatio = rounds.length > 0 ? (correctCount / rounds.length) : 1;
    } else if (gameId === 'paradox') {
      const rounds = pickSeededQuestions(PARADOX_CHAINS, 5, seedNum);
      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let cCount = 0;
      totalQuestions = rounds.length;
      rounds.forEach((round, idx) => {
        const uAns = clientAnswers[idx];
        const isCorrect = uAns === round.answer;
        if (isCorrect) cCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: `Instruction Rule Chain:\n${round.instructions.map(i => '• ' + i).join('\n')}`,
          userAnswer: uAns || 'Not Answered',
          correctAnswer: round.answer,
          isCorrect,
          explanation: `Following all sequential instruction overrides leads to ${round.answer}.`,
          options: round.options,
          category: 'Cognitive Agility'
        });
      });
      correctCount = cCount;
      correctnessRatio = rounds.length > 0 ? (correctCount / rounds.length) : 1;
    } else if (gameId === 'memory-heist') {
      correctCount = Number(gameData?.correctCount) || 3;
      totalQuestions = 3;
      correctnessRatio = Math.max(0, Math.min(1, correctCount / 3));
      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      for (let i = 0; i < 3; i++) {
        const isItemCorrect = i < correctCount;
        reviewItems.push({
          questionNumber: i + 1,
          question: `Vault Recall Check ${i + 1} (Grid Item Location & Count)`,
          userAnswer: clientAnswers[i] || (isItemCorrect ? 'Correct Recall' : 'Incorrect Position'),
          correctAnswer: 'Exact Memory Match',
          isCorrect: isItemCorrect,
          explanation: 'Spatial sequence recall of high-tech items across the 3x3 security grid.',
          category: 'Visual Memory'
        });
      }
    } else if (gameId === 'memory-matrix') {
      const userRounds = Array.isArray(gameData?.userRounds) ? gameData.userRounds : [];
      totalQuestions = 5;
      correctCount = userRounds.filter((r: any) => r.isCorrect).length;
      if (userRounds.length > 0) {
        userRounds.forEach((r: any, idx: number) => {
          reviewItems.push({
            questionNumber: idx + 1,
            question: `Spatial Pattern Round ${idx + 1} (${3 + idx} targets on grid)`,
            userAnswer: r.isCorrect ? 'Correct Pattern Reconstructed' : 'Tile Pattern Mismatch',
            correctAnswer: 'All Target Coordinates Reconstructed',
            isCorrect: Boolean(r.isCorrect),
            explanation: `Memorize and reconstruct all active cell coordinates under timed pressure.`,
            category: 'Spatial Memory'
          });
        });
      } else {
        reviewItems.push({
          questionNumber: 1,
          question: "Memory Matrix 5-Round Pattern Recall",
          userAnswer: `${gameData?.score || 50} pts recorded`,
          correctAnswer: "Complete spatial reconstruction",
          isCorrect: true,
          explanation: "Spatial pattern memory recall across 5 expanding rounds.",
          category: 'Spatial Memory'
        });
      }
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0.8;
    } else if (gameId === 'word-forge') {
      const userWords = Array.isArray(gameData?.words) ? gameData.words : (Array.isArray(gameData?.userAnswers) ? gameData.userAnswers : []);
      const rounds = Array.isArray(gameData?.activeRounds) ? gameData.activeRounds : [];
      totalQuestions = rounds.length || 6;
      rounds.forEach((r: any, idx: number) => {
        const uAns = String(userWords[idx] || '').trim().toUpperCase();
        const cAns = String(r.correctAnswer || '').trim().toUpperCase();
        const isCorrect = uAns === cAns;
        if (isCorrect) correctCount++;
        reviewItems.push({
          questionNumber: idx + 1,
          question: `${r.title || ('Round ' + (idx + 1))}: ${r.question || r.hint}`,
          userAnswer: uAns || 'Not Answered',
          correctAnswer: cAns,
          isCorrect,
          explanation: r.hint || `The technical word was ${cAns}.`,
          category: 'Vocabulary'
        });
      });
      if (reviewItems.length === 0) {
        reviewItems.push({
          questionNumber: 1,
          question: "Word Forge Technical Vocabulary",
          userAnswer: `${gameData?.score || 50} pts completed`,
          correctAnswer: "Anagrams & Clues Solved",
          isCorrect: true,
          explanation: "Vocabulary reconstruction from anagrams and developer clues.",
          category: "Vocabulary"
        });
      }
      correctnessRatio = totalQuestions > 0 ? (correctCount / totalQuestions) : 0.8;
    }

    // Scoring: 50 completion points + 0-50 speed bonus = 50-100
    let maxAllowedTimeMs = 180000;
    if (gameId === 'typing-blitz' || gameId === 'paradox') maxAllowedTimeMs = 120000;
    else if (gameId === 'impossible-room') maxAllowedTimeMs = 300000;
    else if (gameId === 'target-number') maxAllowedTimeMs = 240000;

    const actualDuration = Math.max(1000, durationMs);
    const speedRatio = Math.max(0, 1 - (actualDuration / maxAllowedTimeMs));
    const speedBonus = Math.max(0, Math.min(50, Math.round(50 * speedRatio)));
    const completionPoints = Math.round(50 * correctnessRatio);
    const score = completionPoints + speedBonus;

    const accuracyPercent = Math.round(correctnessRatio * 100);
    const xpEarned = Math.max(50, score * 10);
    const resolvedCorrectCount = correctCount || Math.round(correctnessRatio * (totalQuestions || 5));
    const resolvedTotalQuestions = totalQuestions || 5;

    // 3. Session update
    sessionDocRef.update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.fromDate(completedAt),
      score,
      durationMs,
      accuracy: accuracyPercent,
      correctCount: resolvedCorrectCount,
      totalQuestions: resolvedTotalQuestions,
      reviewItems: reviewItems || []
    }).catch((err: any) => {
      console.warn("[challenge-submit] failed to update session:", err.message);
    });

    let displayName = 'Student';
    let paperinoAvatar = '';

    try {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap && userSnap.exists) {
        const uData = userSnap.data() || {};
        if (uData.displayName && uData.displayName !== 'Student') {
          displayName = uData.displayName;
        }
        paperinoAvatar = uData.paperinoAvatar || '';
      }
    } catch (e) {
      console.warn('[challenge-submit] User profile lookup error:', e);
    }

    if (displayName === 'Student' && admin.auth) {
      try {
        const authRecord = await admin.auth().getUser(uid);
        if (authRecord.displayName) displayName = authRecord.displayName;
        else if (authRecord.email) displayName = authRecord.email.split('@')[0];
      } catch (e) {
        console.warn('[challenge-submit] Auth profile lookup error:', e);
      }
    }

    // 4. Save to official leaderboard ONLY if this was an official attempt
    if (isOfficial) {
      const resultPayload = {
        userId: uid,
        displayName,
        paperinoAvatar,
        challengeId,
        gameId,
        challengeDate,
        weekId,
        durationMs,
        score,
        accuracy: accuracyPercent,
        correctCount: resolvedCorrectCount,
        totalQuestions: resolvedTotalQuestions,
        reviewItems: reviewItems || [],
        isOfficial: true,
        createdAt: admin.firestore.Timestamp.fromDate(completedAt)
      };

      try {
        await adminDb.collection('challenge_results').doc(deterministicResultDocId).set(resultPayload, { merge: true });
        invalidateLeaderboardCache(challengeId);
        invalidateWeeklyLeaderboardCache();
      } catch (writeErr: any) {
        console.warn("[challenge-submit] failed to write deterministic result doc:", writeErr.message);
      }
    }

    // 5. Build leaderboard scoped to this challengeId
    const { leaderboard, userRank } = await buildLeaderboard(challengeId, uid);
    const finalRank = userRank ?? (isOfficial ? 1 : null);
    const finalLeaderboard = leaderboard.length > 0 ? leaderboard : (isOfficial ? [{
      userId: uid,
      displayName,
      paperinoAvatar,
      score,
      durationMs,
      rank: 1
    }] : []);

    return NextResponse.json({
      success: true,
      score,
      xp: xpEarned,
      accuracy: accuracyPercent,
      correctCount: correctCount || Math.round(correctnessRatio * (totalQuestions || 5)),
      totalQuestions: totalQuestions || 5,
      reviewItems,
      durationMs,
      completedAt: completedAt.toISOString(),
      rank: isOfficial ? finalRank : null,
      leaderboard: finalLeaderboard,
      isOfficial
    });

  } catch (error: any) {
    console.error('[challenge-submit] Uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
