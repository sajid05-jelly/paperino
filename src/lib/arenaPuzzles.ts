/**
 * Paperino Challenge Arena — Core Puzzle Definitions & Validation Engine
 * 
 * Provides deterministic seeded puzzle generation, validation, scoring,
 * and comprehensive answer reviews with explanations across all 7 Arena games:
 * 1. Bug Hunter (Code Debugging)
 * 2. Memory Rush (Card Pairing & Concept Recall)
 * 3. Typing Blitz (Speed & Accuracy)
 * 4. Number Detective (Algorithmic Sequences)
 * 5. Logic Master (Visual & Deductive Reasoning)
 * 6. Code Breaker (Binary & Cryptographic Puzzles)
 * 7. Circuit Master (Logic Gate Simulation)
 */

export interface ReviewItem {
  questionNumber: number;
  question: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  options?: string[];
  category?: string;
  details?: Record<string, any>;
}

export interface ArenaQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
  details?: Record<string, any>;
}

// === 1. BUG HUNTER QUESTION POOL ===
export const BUG_HUNTER_POOL: ArenaQuestion[] = [
  {
    id: 'bh-1',
    category: 'Python',
    question: 'What is the bug in this Python function and what will be printed?',
    codeSnippet: `def append_to_list(val, my_list=[]):\n    my_list.append(val)\n    return my_list\n\nprint(append_to_list(1))\nprint(append_to_list(2))`,
    options: [
      '[1] and [1, 2] (Mutable default argument is shared across calls)',
      '[1] and [2] (New list is created on each function invocation)',
      'SyntaxError on line 1',
      'TypeError: cannot append to default argument'
    ],
    correctAnswer: '[1] and [1, 2] (Mutable default argument is shared across calls)',
    explanation: 'In Python, default arguments are evaluated only once when the function is defined. The mutable list is retained and modified across successive calls. Fix: use `my_list=None` and initialize `my_list = []` inside the function.'
  },
  {
    id: 'bh-2',
    category: 'JavaScript',
    question: 'What will be output by this asynchronous loop?',
    codeSnippet: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}`,
    options: [
      '3, 3, 3 (var is function-scoped and loop finishes before timer fires)',
      '0, 1, 2 (each callback captures its own copy of i)',
      '0, 0, 0 (timer captures initial value)',
      'ReferenceError: i is not defined'
    ],
    correctAnswer: '3, 3, 3 (var is function-scoped and loop finishes before timer fires)',
    explanation: '`var` has function scope, meaning all 3 setTimeout callbacks share the same variable reference. By the time the event loop runs the callbacks, the loop has completed with `i = 3`. Replacing `var` with `let` provides block-scoped binding per iteration.'
  },
  {
    id: 'bh-3',
    category: 'C++ / Arrays',
    question: 'Identify the runtime memory flaw in this array traversal:',
    codeSnippet: `int arr[5] = {10, 20, 30, 40, 50};\nfor (int i = 0; i <= 5; i++) {\n    cout << arr[i] << " ";\n}`,
    options: [
      'Out-of-bounds access on index 5 (valid indices are 0 to 4)',
      'Array declaration requires dynamic pointer allocation',
      'Missing semicolon after namespace declaration',
      'Indexing starts at 1 in C++, causing arr[0] to crash'
    ],
    correctAnswer: 'Out-of-bounds access on index 5 (valid indices are 0 to 4)',
    explanation: 'A 5-element array has valid indices from 0 to 4. The loop condition `i <= 5` attempts to access `arr[5]`, leading to undefined behavior or segmentation fault. The fix is `i < 5`.'
  },
  {
    id: 'bh-4',
    category: 'JavaScript',
    question: 'What does this JavaScript type coercion expression evaluate to?',
    codeSnippet: `console.log([] == ![]);`,
    options: [
      'true',
      'false',
      'TypeError: cannot compare array with negation',
      'undefined'
    ],
    correctAnswer: 'true',
    explanation: '`![]` evaluates to `false` because arrays are truthy objects. Then `[] == false` triggers type coercion: both sides convert to numbers (`Number([]) === 0` and `Number(false) === 0`). Since `0 == 0`, it evaluates to `true`.'
  },
  {
    id: 'bh-5',
    category: 'Async / Promises',
    question: 'Why does this code print undefined instead of the user name?',
    codeSnippet: `async function getUser() {\n  return { name: "Alice" };\n}\nconst user = getUser();\nconsole.log(user.name);`,
    options: [
      'Missing await: user is a Promise object, not the resolved value',
      'Async functions cannot return JavaScript object literals',
      'name is a reserved keyword in JavaScript',
      'getUser() must be called with the new operator'
    ],
    correctAnswer: 'Missing await: user is a Promise object, not the resolved value',
    explanation: 'All async functions return a Promise. Without `await getUser()`, `user` holds a pending Promise object which has no `name` property, returning `undefined`. Fix: `const user = await getUser();`.'
  },
  {
    id: 'bh-6',
    category: 'Python',
    question: 'What happens when removing elements during iteration in Python?',
    codeSnippet: `items = [1, 2, 3, 4]\nfor item in items:\n    if item % 2 == 0:\n        items.remove(item)\nprint(items)`,
    options: [
      '[1, 3, 4] (4 was skipped because removing 2 shifted index positions)',
      '[1, 3] (all even elements were cleanly removed)',
      'IndexError: list index out of range',
      '[1, 2, 3, 4] (lists are immutable during for loops)'
    ],
    correctAnswer: '[1, 3, 4] (4 was skipped because removing 2 shifted index positions)',
    explanation: 'Mutating a list while iterating over it causes the internal index pointer to skip the item following the removed element. When `2` is removed, `3` moves to index 1 and `4` shifts to index 2, so the loop pointer skips `4`. Fix: iterate over a slice copy `items[:]` or use a list comprehension.'
  }
];

// === 2. NUMBER DETECTIVE QUESTION POOL ===
export const NUMBER_DETECTIVE_POOL: ArenaQuestion[] = [
  {
    id: 'nd-1',
    category: 'Polynomial Sequences',
    question: 'What is the next number in the sequence?\n2, 5, 10, 17, 26, ?',
    options: ['37', '35', '36', '39'],
    correctAnswer: '37',
    explanation: 'The pattern is n² + 1 for n = 1, 2, 3, 4, 5, 6. For n=6, 6² + 1 = 36 + 1 = 37. Alternatively, differences increase by consecutive odd numbers: +3, +5, +7, +9, +11.'
  },
  {
    id: 'nd-2',
    category: 'Factorial & Products',
    question: 'Identify the missing number:\n2, 6, 12, 20, 30, ?',
    options: ['42', '40', '44', '36'],
    correctAnswer: '42',
    explanation: 'The pattern is n × (n + 1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, and 6×7=42. Differences are consecutive even numbers: +4, +6, +8, +10, +12.'
  },
  {
    id: 'nd-3',
    category: 'Prime Sequences',
    question: 'Find the next number in this sequence:\n2, 3, 5, 7, 11, 13, ?',
    options: ['17', '15', '19', '14'],
    correctAnswer: '17',
    explanation: 'This is the sequence of consecutive prime numbers. 15 and 14 are composite, and the prime immediately following 13 is 17.'
  },
  {
    id: 'nd-4',
    category: 'Alternating Operations',
    question: 'Crack the alternating pattern:\n3, 6, 8, 16, 18, 36, ?',
    options: ['38', '72', '40', '37'],
    correctAnswer: '38',
    explanation: 'The operations alternate between multiplying by 2 and adding 2: 3 × 2 = 6, 6 + 2 = 8, 8 × 2 = 16, 16 + 2 = 18, 18 × 2 = 36, and 36 + 2 = 38.'
  },
  {
    id: 'nd-5',
    category: 'Geometric Sequences',
    question: 'What completes this sequence?\n192, 96, 48, 24, 12, ?',
    options: ['6', '8', '4', '3'],
    correctAnswer: '6',
    explanation: 'Each successive term is divided by 2 (geometric progression with common ratio r = 0.5): 12 / 2 = 6.'
  },
  {
    id: 'nd-6',
    category: 'Cubic Series',
    question: 'What is the next number in the cube series?\n1, 8, 27, 64, 125, ?',
    options: ['216', '196', '225', '243'],
    correctAnswer: '216',
    explanation: 'The pattern represents cubes of consecutive positive integers n³: 1³=1, 2³=8, 3³=27, 4³=64, 5³=125, and 6³ = 216.'
  }
];

// === 3. LOGIC MASTER QUESTION POOL ===
export const LOGIC_MASTER_POOL: ArenaQuestion[] = [
  {
    id: 'lm-1',
    category: 'Deductive Logic',
    question: 'If all Software Engineers write Code, and some Code writers use Linux, which conclusion is definitely true?',
    options: [
      'Some Software Engineers may use Linux',
      'All Linux users are Software Engineers',
      'No Software Engineer uses Linux',
      'Every Code writer is a Software Engineer'
    ],
    correctAnswer: 'Some Software Engineers may use Linux',
    explanation: 'Since Software Engineers are a subset of Code writers, and there exists an intersection between Code writers and Linux users, it is logically possible (and valid) that some Software Engineers use Linux. Absolute claims cannot be deduced.'
  },
  {
    id: 'lm-2',
    category: 'Spatial Reasoning',
    question: 'A clock shows 3:15. What is the exact angle between the hour hand and minute hand?',
    options: ['7.5°', '0°', '15°', '5°'],
    correctAnswer: '7.5°',
    explanation: 'At 3:15, the minute hand is at 90° (at 3). In 15 minutes, the hour hand has moved forward by 15 × 0.5° = 7.5° past the 3 o clock mark. Therefore, the angle between them is 7.5°.'
  },
  {
    id: 'lm-3',
    category: 'Tournament Bracket Logic',
    question: 'In a single-elimination tournament with 16 players, how many total matches must be played to determine the champion?',
    options: ['15', '16', '31', '8'],
    correctAnswer: '15',
    explanation: 'In single-elimination formats, every match eliminates exactly one participant. To reduce 16 participants down to 1 sole champion, exactly 16 - 1 = 15 participants must be eliminated, requiring 15 matches.'
  },
  {
    id: 'lm-4',
    category: 'Transitive Relations',
    question: 'Server A is faster than B. Server C is faster than A. Server D is slower than B. Which server is the fastest?',
    options: ['Server C', 'Server A', 'Server B', 'Server D'],
    correctAnswer: 'Server C',
    explanation: 'Establishing the speed inequality chain: C > A > B > D. Server C is strictly faster than all other servers.'
  },
  {
    id: 'lm-5',
    category: 'Dimensional Analogies',
    question: 'Complete the analogy:\nCircle : Sphere :: Square : ?',
    options: ['Cube', 'Pyramid', 'Triangle', 'Cylinder'],
    correctAnswer: 'Cube',
    explanation: 'A circle is the two-dimensional counterpart of a three-dimensional sphere. In the same relation, a square is the two-dimensional counterpart of a three-dimensional cube.'
  }
];

// === 4. CODE BREAKER QUESTION POOL ===
export const CODE_BREAKER_POOL: ArenaQuestion[] = [
  {
    id: 'cb-1',
    category: 'Binary Conversion',
    question: 'Convert binary 101101 to decimal:',
    options: ['45', '43', '47', '51'],
    correctAnswer: '45',
    explanation: 'Binary weights from right to left: (1×1) + (0×2) + (1×4) + (1×8) + (0×16) + (1×32) = 1 + 4 + 8 + 32 = 45.'
  },
  {
    id: 'cb-2',
    category: 'Bitwise Operators',
    question: 'Evaluate decimal bitwise operation: 12 & 10',
    options: ['8', '10', '14', '2'],
    correctAnswer: '8',
    explanation: '12 in binary is 1100. 10 in binary is 1010. Bitwise AND: 1100 & 1010 = 1000 in binary, which equals 8 in decimal.'
  },
  {
    id: 'cb-3',
    category: 'Bitwise XOR',
    question: 'Evaluate bitwise XOR: 7 ^ 5',
    options: ['2', '3', '12', '0'],
    correctAnswer: '2',
    explanation: '7 = 0111 in binary, 5 = 0101 in binary. XOR outputs 1 when bits differ: 0111 ^ 0101 = 0010 = 2 in decimal.'
  },
  {
    id: 'cb-4',
    category: 'Hexadecimal',
    question: 'Convert hexadecimal 0x3F to decimal:',
    options: ['63', '59', '65', '47'],
    correctAnswer: '63',
    explanation: '0x3F = (3 × 16¹) + (15 × 16⁰) = 48 + 15 = 63.'
  },
  {
    id: 'cb-5',
    category: 'Big-O Analysis',
    question: 'What is the time complexity of this loop?\nfor (int i = 1; i < n; i *= 2) { ... }',
    options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
    correctAnswer: 'O(log n)',
    explanation: 'The index doubles on each iteration (1, 2, 4, 8, ...). It reaches n in log₂(n) steps, giving logarithmic time complexity O(log n).'
  },
  {
    id: 'cb-6',
    category: 'Bit Shifting',
    question: 'Evaluate the bitwise left shift: 5 << 2',
    options: ['20', '10', '25', '7'],
    correctAnswer: '20',
    explanation: 'Left shifting a number by k bits multiplies it by 2^k. Here: 5 × 2² = 5 × 4 = 20. In binary: 000101 << 2 = 010100 = 20.'
  }
];

// === 5. CIRCUIT MASTER CIRCUITS ===
export interface CircuitChallenge {
  id: string;
  title: string;
  expression: string;
  inputs: string[];
  targetOutput: number;
  explanation: string;
  validate: (inputs: Record<string, number>) => { output: number; isCorrect: boolean };
}

export const CIRCUIT_CHALLENGES: CircuitChallenge[] = [
  {
    id: 'cm-1',
    title: 'Dual-Input AND Gate',
    expression: 'Output = A AND B',
    inputs: ['A', 'B'],
    targetOutput: 1,
    explanation: 'An AND gate outputs 1 (True) only when both inputs A and B are active (1). If either input is 0, the output is 0.',
    validate: (inputs) => {
      const out = (inputs.A === 1 && inputs.B === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-2',
    title: 'Compound OR-AND Gate with Inverter',
    expression: 'Output = (A OR B) AND (NOT C)',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'For the AND gate to evaluate to 1, both branches must be 1. Thus (NOT C) = 1 requires C = 0. The other branch (A OR B) requires at least one of A or B to be 1.',
    validate: (inputs) => {
      const branch1 = (inputs.A === 1 || inputs.B === 1) ? 1 : 0;
      const branch2 = (inputs.C === 0) ? 1 : 0;
      const out = (branch1 === 1 && branch2 === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-3',
    title: 'Exclusive-OR (XOR) Gate with Control Switch',
    expression: 'Output = (A XOR B) AND C',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'An XOR gate yields 1 only when inputs differ (one 0 and one 1). The final AND gate also requires control input C to be 1.',
    validate: (inputs) => {
      const xorOut = (inputs.A !== inputs.B) ? 1 : 0;
      const out = (xorOut === 1 && inputs.C === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-4',
    title: 'Universal NAND-OR Logic Circuit',
    expression: 'Output = (A NAND B) AND (B OR C)',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'A NAND B produces 0 only when both A=1 and B=1. Setting A=0 guarantees NAND output is 1. If B=1 or C=1, the OR gate outputs 1, successfully resulting in 1.',
    validate: (inputs) => {
      const nandOut = !(inputs.A === 1 && inputs.B === 1) ? 1 : 0;
      const orOut = (inputs.B === 1 || inputs.C === 1) ? 1 : 0;
      const out = (nandOut === 1 && orOut === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  }
];

// === 6. MEMORY RUSH CONCEPT CARDS ===
export interface MemoryRushCard {
  id: string;
  symbol: string;
  name: string;
  concept: string;
}

export const MEMORY_RUSH_CARDS: MemoryRushCard[] = [
  { id: 'react', symbol: '⚛️', name: 'React', concept: 'Component-driven declarative UI library with virtual DOM reconciliation' },
  { id: 'python', symbol: '🐍', name: 'Python', concept: 'High-level interpreted language favored for data science and backend APIs' },
  { id: 'ts', symbol: '🔷', name: 'TypeScript', concept: 'Static typing layer on top of JavaScript for safer enterprise codebases' },
  { id: 'docker', symbol: '🐳', name: 'Docker', concept: 'Lightweight containerization enabling reproducible execution environments' },
  { id: 'graphql', symbol: '🔮', name: 'GraphQL', concept: 'API query language allowing clients to request exact data structures' },
  { id: 'rust', symbol: '🦀', name: 'Rust', concept: 'Zero-cost abstractions with compile-time borrow checker for memory safety' },
  { id: 'db', symbol: '💾', name: 'Postgres', concept: 'ACID-compliant relational database management system with strong consistency' },
  { id: 'k8s', symbol: '☸️', name: 'Kubernetes', concept: 'Production container orchestrator for scaling, load-balancing, and self-healing' },
];

// === 7. TYPING BLITZ CODE SNIPPETS ===
export interface TypingBlitzSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  explanation: string;
}

export const TYPING_BLITZ_SNIPPETS: TypingBlitzSnippet[] = [
  {
    id: 'tb-1',
    title: 'React State Hook',
    language: 'TypeScript',
    code: 'const [score, setScore] = useState<number>(0);',
    explanation: 'Declares state variable score with number type constraint and setScore updater function.'
  },
  {
    id: 'tb-2',
    title: 'Async API Request',
    language: 'JavaScript',
    code: 'const res = await fetch("/api/leaderboard");',
    explanation: 'Performs asynchronous HTTP GET request and waits for Promise resolution.'
  },
  {
    id: 'tb-3',
    title: 'Array Filter Predicate',
    language: 'JavaScript',
    code: 'const active = items.filter(i => i.status === "active");',
    explanation: 'Filters elements into a new immutable array matching the status condition.'
  }
];

/**
 * Deterministic PRNG helper
 */
function seededRand(seed: number) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Helper to pick n unique items using a seeded generator
 */
export function pickSeededQuestions<T>(pool: T[], count: number, seedNum: number): T[] {
  const rand = seededRand(seedNum);
  const copy = [...pool];
  const selected: T[] = [];
  const limit = Math.min(count, copy.length);

  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(rand() * copy.length);
    selected.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return selected;
}
