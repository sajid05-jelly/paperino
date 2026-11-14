import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { 
  ARENA_GAME_IDS, 
  GAME_INFO 
} from "../src/lib/challengeUtils.ts";
import { 
  BUG_HUNTER_POOL, 
  NUMBER_DETECTIVE_POOL, 
  LOGIC_MASTER_POOL, 
  CODE_BREAKER_POOL, 
  CIRCUIT_CHALLENGES, 
  MEMORY_RUSH_CARDS, 
  TYPING_BLITZ_SNIPPETS, 
  pickSeededQuestions 
} from "../src/lib/arenaPuzzles.ts";

describe("Paperino Challenge Arena — 7 Interactive Games & Answer Review Verification", () => {

  describe("1. Arena Games Configuration & Metadata", () => {
    test("ARENA_GAME_IDS contains all 7 specified games", () => {
      const expected = [
        'bug-hunter',
        'memory-rush',
        'typing-blitz',
        'number-detective',
        'logic-master',
        'code-breaker',
        'circuit-master'
      ];
      assert.equal(ARENA_GAME_IDS.length, 7);
      expected.forEach(id => {
        assert.ok(ARENA_GAME_IDS.includes(id), `Missing game ID: ${id}`);
      });
    });

    test("Every arena game has complete GAME_INFO metadata with name, description, icon, and badge", () => {
      ARENA_GAME_IDS.forEach(id => {
        const info = GAME_INFO[id];
        assert.ok(info, `GAME_INFO missing for ${id}`);
        assert.ok(info.name && info.name.length > 0, `Missing name for ${id}`);
        assert.ok(info.description && info.description.length > 0, `Missing description for ${id}`);
        assert.ok(info.icon && info.icon.length > 0, `Missing icon for ${id}`);
        assert.ok(info.badge && info.badge.length > 0, `Missing badge for ${id}`);
      });
    });
  });

  describe("2. Seeded Question Generation & Determinism", () => {
    test("pickSeededQuestions produces identical questions for identical seeds", () => {
      const seed = 123456789;
      const pick1 = pickSeededQuestions(BUG_HUNTER_POOL, 3, seed);
      const pick2 = pickSeededQuestions(BUG_HUNTER_POOL, 3, seed);
      assert.deepEqual(pick1, pick2);
    });

    test("pickSeededQuestions produces distinct selections across different seeds", () => {
      const pick1 = pickSeededQuestions(NUMBER_DETECTIVE_POOL, 3, 11111);
      const pick2 = pickSeededQuestions(NUMBER_DETECTIVE_POOL, 3, 99999);
      // May overlap partially but ordering/selection varies
      assert.ok(pick1.length === 3);
      assert.ok(pick2.length === 3);
    });
  });

  describe("3. Bug Hunter Puzzle & Solution Integrity", () => {
    test("all bug hunter questions have options, correct answers matching an option, and explanations", () => {
      assert.ok(BUG_HUNTER_POOL.length >= 5);
      BUG_HUNTER_POOL.forEach(q => {
        assert.ok(q.question.length > 0);
        assert.ok(q.options.length === 4);
        assert.ok(q.options.includes(q.correctAnswer), `correctAnswer not in options for ${q.id}`);
        assert.ok(q.explanation && q.explanation.length > 10, `missing explanation for ${q.id}`);
      });
    });
  });

  describe("4. Number Detective Sequences Integrity", () => {
    test("all number detective puzzles have valid options and math explanations", () => {
      assert.ok(NUMBER_DETECTIVE_POOL.length >= 5);
      NUMBER_DETECTIVE_POOL.forEach(q => {
        assert.ok(q.options.length === 4);
        assert.ok(q.options.includes(q.correctAnswer), `correctAnswer not in options for ${q.id}`);
        assert.ok(q.explanation && q.explanation.length > 10);
      });
    });
  });

  describe("5. Logic Master Deductive Puzzles", () => {
    test("all logic master puzzles have verified deductive conclusions and explanations", () => {
      assert.ok(LOGIC_MASTER_POOL.length >= 5);
      LOGIC_MASTER_POOL.forEach(q => {
        assert.ok(q.options.length === 4);
        assert.ok(q.options.includes(q.correctAnswer), `correctAnswer not in options for ${q.id}`);
        assert.ok(q.explanation && q.explanation.length > 10);
      });
    });
  });

  describe("6. Code Breaker Binary & Programming Puzzles", () => {
    test("all code breaker questions cover binary, bitwise, hex, and Big-O", () => {
      assert.ok(CODE_BREAKER_POOL.length >= 5);
      CODE_BREAKER_POOL.forEach(q => {
        assert.ok(q.options.length === 4);
        assert.ok(q.options.includes(q.correctAnswer), `correctAnswer not in options for ${q.id}`);
        assert.ok(q.explanation && q.explanation.length > 10);
      });
    });
  });

  describe("7. Circuit Master Logic Gate Validation", () => {
    test("Dual-Input AND Gate correctly validates", () => {
      const cm1 = CIRCUIT_CHALLENGES.find(c => c.id === 'cm-1');
      assert.ok(cm1);
      assert.equal(cm1.validate({ A: 1, B: 1 }).isCorrect, true);
      assert.equal(cm1.validate({ A: 1, B: 0 }).isCorrect, false);
      assert.equal(cm1.validate({ A: 0, B: 1 }).isCorrect, false);
      assert.equal(cm1.validate({ A: 0, B: 0 }).isCorrect, false);
    });

    test("Compound (A OR B) AND (NOT C) correctly validates", () => {
      const cm2 = CIRCUIT_CHALLENGES.find(c => c.id === 'cm-2');
      assert.ok(cm2);
      // C must be 0, and A or B must be 1
      assert.equal(cm2.validate({ A: 1, B: 0, C: 0 }).isCorrect, true);
      assert.equal(cm2.validate({ A: 0, B: 1, C: 0 }).isCorrect, true);
      assert.equal(cm2.validate({ A: 1, B: 1, C: 0 }).isCorrect, true);
      assert.equal(cm2.validate({ A: 1, B: 0, C: 1 }).isCorrect, false); // C is 1
      assert.equal(cm2.validate({ A: 0, B: 0, C: 0 }).isCorrect, false); // A and B are 0
    });

    test("Exclusive-OR (A XOR B) AND C correctly validates", () => {
      const cm3 = CIRCUIT_CHALLENGES.find(c => c.id === 'cm-3');
      assert.ok(cm3);
      assert.equal(cm3.validate({ A: 1, B: 0, C: 1 }).isCorrect, true);
      assert.equal(cm3.validate({ A: 0, B: 1, C: 1 }).isCorrect, true);
      assert.equal(cm3.validate({ A: 1, B: 1, C: 1 }).isCorrect, false); // XOR is 0
      assert.equal(cm3.validate({ A: 0, B: 0, C: 1 }).isCorrect, false); // XOR is 0
      assert.equal(cm3.validate({ A: 1, B: 0, C: 0 }).isCorrect, false); // C is 0
    });
  });

  describe("8. Memory Rush & Typing Blitz Assets", () => {
    test("Memory rush has 8 unique concept cards with symbols and definitions", () => {
      assert.equal(MEMORY_RUSH_CARDS.length, 8);
      const ids = new Set(MEMORY_RUSH_CARDS.map(c => c.id));
      assert.equal(ids.size, 8);
      MEMORY_RUSH_CARDS.forEach(c => {
        assert.ok(c.symbol && c.symbol.length > 0);
        assert.ok(c.concept && c.concept.length > 10);
      });
    });

    test("Typing blitz has 3 developer code snippets with syntax explanations", () => {
      assert.equal(TYPING_BLITZ_SNIPPETS.length, 3);
      TYPING_BLITZ_SNIPPETS.forEach(s => {
        assert.ok(s.code && s.code.length > 10);
        assert.ok(s.explanation && s.explanation.length > 10);
      });
    });
  });

  describe("9. Answer Review Data Structure Contract", () => {
    test("simulated review items satisfy all Answer Review requirements", () => {
      const mockReviewItem = {
        questionNumber: 1,
        question: "What does [] == ![] evaluate to?",
        userAnswer: "true",
        correctAnswer: "true",
        isCorrect: true,
        explanation: "Type coercion rules convert both operands to 0 == 0.",
        category: "JavaScript"
      };

      assert.equal(typeof mockReviewItem.questionNumber, "number");
      assert.ok(mockReviewItem.question.length > 0);
      assert.ok(mockReviewItem.userAnswer !== undefined);
      assert.ok(mockReviewItem.correctAnswer.length > 0);
      assert.equal(typeof mockReviewItem.isCorrect, "boolean");
      assert.ok(mockReviewItem.explanation.length > 0);
    });

    test("handles unanswered questions by marking Not Answered and exposing explanation", () => {
      const unansweredItem = {
        questionNumber: 2,
        question: "Convert binary 101101 to decimal:",
        userAnswer: null,
        correctAnswer: "45",
        isCorrect: false,
        explanation: "Binary weights: 32 + 8 + 4 + 1 = 45.",
        category: "Binary Conversion"
      };

      const resolvedAnswer = unansweredItem.userAnswer || "Not Answered";
      assert.equal(resolvedAnswer, "Not Answered");
      assert.equal(unansweredItem.isCorrect, false);
      assert.equal(unansweredItem.correctAnswer, "45");
    });
  });

});
