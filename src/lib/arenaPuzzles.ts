/**
 * Paperino Challenge Arena — Core Puzzle Definitions & Validation Engine
 * 
 * Provides dynamic randomized puzzle generation, validation, scoring,
 * and comprehensive answer reviews with explanations across all 14 Arena games:
 * 1. Bug Hunter (Code Debugging)
 * 2. Memory Rush (Card Pairing & Concept Recall)
 * 3. Typing Blitz (Speed & Accuracy)
 * 4. Number Detective (Algorithmic Sequences)
 * 5. Logic Master (Visual & Deductive Reasoning)
 * 6. Code Breaker (Binary & Cryptographic Puzzles)
 * 7. Circuit Master (Logic Gate Simulation)
 * 8. Memory Matrix (Spatial Grid Memory)
 * 9. Impossible Room (Escape Room Logic)
 * 10. Word Forge (Scrambled Anagrams)
 * 11. Target Number (Mental Arithmetic)
 * 12. Memory Heist (Grid Placement Recall)
 * 13. The Impostor (Logic Deduction)
 * 14. Paradox (Chain of Instruction Overrides)
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

// ============================================================================
// === 1. BUG HUNTER QUESTION POOL (30 UNIQUE PROGRAMMING PUZZLES) ==========
// ============================================================================
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
  },
  {
    id: 'bh-7',
    category: 'JavaScript / IEEE-754',
    question: 'Why does 0.1 + 0.2 === 0.3 evaluate to false in JavaScript?',
    codeSnippet: `console.log(0.1 + 0.2 === 0.3);\nconsole.log(0.1 + 0.2);`,
    options: [
      'Binary floating-point precision error (equals ~0.30000000000000004)',
      'JavaScript restricts arithmetic to 32-bit integers by default',
      'Triple equals checks memory addresses of numbers',
      'The addition operator implicitly concatenates floats as strings'
    ],
    correctAnswer: 'Binary floating-point precision error (equals ~0.30000000000000004)',
    explanation: 'JavaScript numbers are 64-bit binary floating point (IEEE-754). Fractions like 0.1 and 0.2 cannot be represented precisely in base-2 binary, yielding 0.30000000000000004. Fix: use `Number.EPSILON` for floating comparison: `Math.abs((0.1 + 0.2) - 0.3) < Number.EPSILON`.'
  },
  {
    id: 'bh-8',
    category: 'Python / Closures',
    question: 'What will be printed when calling these lambda functions?',
    codeSnippet: `funcs = [lambda: i for i in range(3)]\nprint([f() for f in funcs])`,
    options: [
      '[2, 2, 2] (Variables are looked up at invocation time, not definition time)',
      '[0, 1, 2] (Each lambda captures the loop value at its definition)',
      '[0, 0, 0] (i resets to 0 after list comprehension terminates)',
      'SyntaxError: lambda cannot be defined inside list comprehension'
    ],
    correctAnswer: '[2, 2, 2] (Variables are looked up at invocation time, not definition time)',
    explanation: 'Python closures bind to variable names rather than values (late binding). When the lambdas execute, the loop has completed and `i` equals 2. Fix: bind `i` as a default argument: `lambda i=i: i`.'
  },
  {
    id: 'bh-9',
    category: 'Database / Security',
    question: 'Identify the critical vulnerability in this database query construction:',
    codeSnippet: `const query = "SELECT * FROM users WHERE email = '" + req.body.email + "' AND password = '" + req.body.password + "'";\ndb.query(query);`,
    options: [
      'SQL Injection vulnerability via unsanitized string concatenation',
      'Cross-Site Scripting (XSS) in server memory',
      'Database connection leak due to missing pool release',
      'SyntaxError: single quotes are invalid in SQL WHERE clauses'
    ],
    correctAnswer: 'SQL Injection vulnerability via unsanitized string concatenation',
    explanation: 'Directly concatenating untrusted user input into SQL commands allows attackers to bypass authentication using payloads like `\' OR \'1\'=\'1`. Fix: always use parameterized / prepared queries (e.g. `SELECT * FROM users WHERE email = ? AND password = ?`).'
  },
  {
    id: 'bh-10',
    category: 'React / Hooks',
    question: 'What bug occurs in this timer interval React component?',
    codeSnippet: `function Counter() {\n  const [count, setCount] = useState(0);\n  useEffect(() => {\n    const timer = setInterval(() => {\n      setCount(count + 1);\n    }, 1000);\n    return () => clearInterval(timer);\n  }, []);\n  return <h1>{count}</h1>;\n}`,
    options: [
      'Stale closure: count remains 0 in the callback and never increments beyond 1',
      'Memory leak: clearInterval is never called on unmount',
      'Infinite re-render loop on initial mount',
      'TypeError: setInterval cannot be invoked inside useEffect'
    ],
    correctAnswer: 'Stale closure: count remains 0 in the callback and never increments beyond 1',
    explanation: 'With an empty dependency array `[]`, the effect closure captures `count = 0` forever. Every second it executes `setCount(0 + 1)`, staying at 1. Fix: use functional state updater `setCount(prev => prev + 1)`.'
  },
  {
    id: 'bh-11',
    category: 'C++ / Pointers',
    question: 'What is the severe undefined behavior in this C++ function?',
    codeSnippet: `int* getPointer() {\n    int val = 42;\n    return &val;\n}\nint main() {\n    int* ptr = getPointer();\n    cout << *ptr;\n}`,
    options: [
      'Returning address of a local stack variable that is deallocated upon function return',
      'Integer literals cannot be assigned memory addresses',
      'cout cannot dereference pointers directly',
      'Missing dynamic_cast operator on return pointer'
    ],
    correctAnswer: 'Returning address of a local stack variable that is deallocated upon function return',
    explanation: '`val` is allocated on the stack frame of `getPointer()`. Once the function exits, that stack memory is reclaimed, leaving `ptr` as a dangling pointer. Dereferencing it causes undefined behavior. Fix: return by value `int` or allocate on the heap with smart pointers.'
  },
  {
    id: 'bh-12',
    category: 'JavaScript / Numbers',
    question: 'Why does Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2 evaluate to true?',
    codeSnippet: `const max = Number.MAX_SAFE_INTEGER;\nconsole.log(max + 1 === max + 2);`,
    options: [
      'Exceeds 53-bit mantissa precision limit, causing both to round to the same IEEE-754 float',
      'JavaScript automatically clamps numbers greater than max to Infinity',
      'Arithmetic overflow wraps integers to negative numbers in strict mode',
      'Equality operator casts large numbers to boolean true'
    ],
    correctAnswer: 'Exceeds 53-bit mantissa precision limit, causing both to round to the same IEEE-754 float',
    explanation: '`Number.MAX_SAFE_INTEGER` is 2⁵³ - 1 (9007199254740991). Numbers beyond this limit lose integer precision in standard 64-bit floats and round to the same nearest representable even float. Fix: use `BigInt` for arbitrary precision integers.'
  },
  {
    id: 'bh-13',
    category: 'Python / Syntax',
    question: 'What is the type of variable x in this Python declaration?',
    codeSnippet: `x = (42)\nprint(type(x))`,
    options: [
      '<class \'int\'> (Parentheses without a trailing comma define grouping, not a tuple)',
      '<class \'tuple\'> (Any value wrapped in parentheses is a tuple)',
      '<class \'list\'> (Single-item collections convert to lists)',
      'SyntaxError: single elements cannot be enclosed in parentheses'
    ],
    correctAnswer: '<class \'int\'> (Parentheses without a trailing comma define grouping, not a tuple)',
    explanation: 'In Python, the comma creates a tuple, not parentheses. `(42)` is treated as arithmetic grouping and evaluates to the integer `42`. To construct a 1-element tuple, a trailing comma is required: `(42,)`.'
  },
  {
    id: 'bh-14',
    category: 'Java / Strings',
    question: 'Why does s1 == s2 evaluate to false in this Java code?',
    codeSnippet: `String s1 = new String("Paperino");\nString s2 = new String("Paperino");\nSystem.out.println(s1 == s2);`,
    options: [
      '== compares reference memory addresses, not string character content',
      'new String creates immutable buffers that reject equality operators',
      'Strings in Java must be compared using the compareTo() method only',
      'The second string allocation overwrites the string constant pool'
    ],
    correctAnswer: '== compares reference memory addresses, not string character content',
    explanation: 'In Java, `==` on non-primitive objects compares reference identity (memory addresses). `new String()` forces two distinct heap object allocations. Fix: use `s1.equals(s2)` to compare string character content.'
  },
  {
    id: 'bh-15',
    category: 'React / State',
    question: 'Why does clicking the button not trigger a re-render in this React component?',
    codeSnippet: `function UserProfile() {\n  const [user, setUser] = useState({ name: "Alex", score: 10 });\n  const handleLevelUp = () => {\n    user.score += 10;\n    setUser(user);\n  };\n  return <div>Score: {user.score}</div>;\n}`,
    options: [
      'State object reference was mutated in place; React sees identical reference and skips re-render',
      'useState does not support objects as state values',
      'handleLevelUp must return a Promise to trigger reconciliation',
      'score property is read-only on state objects'
    ],
    correctAnswer: 'State object reference was mutated in place; React sees identical reference and skips re-render',
    explanation: 'React uses `Object.is` shallow reference comparison to detect state changes. Since `user` was mutated directly, `setUser(user)` receives the same object reference and bails out of re-rendering. Fix: create a new object: `setUser({ ...user, score: user.score + 10 })`.'
  },
  {
    id: 'bh-16',
    category: 'JavaScript / Types',
    question: 'What is the output of typeof NaN in JavaScript?',
    codeSnippet: `console.log(typeof NaN);`,
    options: [
      '"number" (NaN is a numeric data type representing an invalid calculation)',
      '"nan" (Special primitive type in ECMAScript)',
      '"undefined" (Uncomputable values produce undefined type)',
      '"object" (Global math constant)'
    ],
    correctAnswer: '"number" (NaN is a numeric data type representing an invalid calculation)',
    explanation: 'According to IEEE-754 standard, NaN (Not-a-Number) is a special numeric value indicating an unrepresentable arithmetic outcome (such as `0 / 0` or `parseInt("abc")`). In JavaScript, `typeof NaN === "number"`.'
  },
  {
    id: 'bh-17',
    category: 'Python / Dictionaries',
    question: 'What exception is raised by this Python dictionary operation?',
    codeSnippet: `my_dict = {}\nmy_dict[[1, 2, 3]] = "numbers"`,
    options: [
      'TypeError: unhashable type: \'list\'',
      'KeyError: list keys require quotation marks',
      'ValueError: list cannot be unpacked into key space',
      'IndexError: invalid hash slot allocation'
    ],
    correctAnswer: 'TypeError: unhashable type: \'list\'',
    explanation: 'Dictionary keys in Python must be hashable and immutable so their hash values remain constant throughout execution. Lists are mutable and do not implement `__hash__`. Fix: use an immutable tuple as key: `(1, 2, 3)`.'
  },
  {
    id: 'bh-18',
    category: 'C++ / Memory Management',
    question: 'What is the flaw in this dynamic memory allocation pattern?',
    codeSnippet: `void processData() {\n    int* buffer = new int[1024];\n    if (!validateInput()) return;\n    delete[] buffer;\n}`,
    options: [
      'Memory leak if validateInput() returns false before delete[] buffer is reached',
      'new int[1024] must be freed using single delete buffer',
      'Local buffer pointers are automatically deleted upon stack unwind',
      'Array allocation size must be determined at compile-time with constexpr'
    ],
    correctAnswer: 'Memory leak if validateInput() returns false before delete[] buffer is reached',
    explanation: 'If `validateInput()` returns false, the early return exits the function without executing `delete[] buffer`, leaking 4KB of heap memory. Fix: adopt RAII using `std::vector<int>` or `std::unique_ptr<int[]>`.'
  },
  {
    id: 'bh-19',
    category: 'JavaScript / Arrays',
    question: 'What will be output by default Array.prototype.sort() on numeric arrays?',
    codeSnippet: `const numbers = [10, 5, 20, 3];\nnumbers.sort();\nconsole.log(numbers);`,
    options: [
      '[10, 20, 3, 5] (Default sort converts elements to strings and compares UTF-16 code units)',
      '[3, 5, 10, 20] (Default sort automatically orders numbers in ascending order)',
      '[20, 10, 5, 3] (Default sort orders in descending order)',
      'TypeError: numeric sort requires explicit comparison callback'
    ],
    correctAnswer: '[10, 20, 3, 5] (Default sort converts elements to strings and compares UTF-16 code units)',
    explanation: 'In JavaScript, `Array.prototype.sort()` converts elements to strings by default and sorts lexicographically. Because `"1"` comes before `"2"`, `"3"`, and `"5"`, `10` and `20` appear before `3`. Fix: pass comparison function `(a, b) => a - b`.'
  },
  {
    id: 'bh-20',
    category: 'Python / Identity',
    question: 'Why does a is b evaluate to False for larger numbers in Python?',
    codeSnippet: `a = 257\nb = 257\nprint(a is b)`,
    options: [
      'Python only caches small integer objects from -5 to 256; larger integers get distinct memory addresses',
      'The is operator cannot compare numeric literals',
      '257 triggers an internal 16-bit integer boundary conversion',
      'Variable b creates an isolated namespace clone'
    ],
    correctAnswer: 'Python only caches small integer objects from -5 to 256; larger integers get distinct memory addresses',
    explanation: 'CPython pre-allocates an integer cache for integers in the range [-5, 256]. For numbers outside this range, separate integer objects are allocated in memory, making `is` (reference equality) evaluate to `False` in interactive mode. Fix: use `==` for value comparison.'
  },
  {
    id: 'bh-21',
    category: 'SQL / Logic',
    question: 'What is the result of evaluating NULL = NULL in SQL?',
    codeSnippet: `SELECT CASE WHEN NULL = NULL THEN 'Equal' ELSE 'Not Equal' END;`,
    options: [
      'Not Equal (NULL represents unknown, so comparison yields UNKNOWN / falsy in boolean test)',
      'Equal (Identical primitive values always evaluate to True)',
      'SyntaxError: NULL cannot be compared with equality operator',
      'NullPointerException thrown by database query planner'
    ],
    correctAnswer: 'Not Equal (NULL represents unknown, so comparison yields UNKNOWN / falsy in boolean test)',
    explanation: 'SQL uses three-valued logic (TRUE, FALSE, UNKNOWN). `NULL` represents an unknown or missing value, so comparing `NULL = NULL` yields `UNKNOWN`, which evaluates to `ELSE` branch in a CASE expression. Fix: use `IS NULL` or `IS NOT DISTINCT FROM`.'
  },
  {
    id: 'bh-22',
    category: 'JavaScript / ASI',
    question: 'What does this JavaScript function return due to Automatic Semicolon Insertion?',
    codeSnippet: `function getData() {\n  return\n  {\n    status: "ok"\n  };\n}\nconsole.log(getData());`,
    options: [
      'undefined (Semicolon is automatically inserted immediately after return keyword)',
      '{ status: "ok" } (Object literal is returned normally)',
      'SyntaxError: unexpected token { after return',
      'null (Empty return defaults to null object)'
    ],
    correctAnswer: 'undefined (Semicolon is automatically inserted immediately after return keyword)',
    explanation: 'JavaScript\'s Automatic Semicolon Insertion (ASI) parser places a semicolon right after `return` because of the line break. The code executes as `return;`, returning `undefined`, and the object block below is ignored. Fix: place the opening brace on the same line: `return {`.'
  },
  {
    id: 'bh-23',
    category: 'TypeScript / Types',
    question: 'What is the primary difference between any and unknown in TypeScript?',
    codeSnippet: `let val1: any = "paperino";\nlet val2: unknown = "paperino";\nval1.toUpperCase(); // Allowed\nval2.toUpperCase(); // Error!`,
    options: [
      'unknown is type-safe: TypeScript forces type checking/narrowing before invoking methods on it',
      'any supports primitive types while unknown is restricted to class instances',
      'unknown variables are erased during compilation to JavaScript',
      'any variables cannot be reassigned after declaration'
    ],
    correctAnswer: 'unknown is type-safe: TypeScript forces type checking/narrowing before invoking methods on it',
    explanation: '`any` completely disables all type checking. In contrast, `unknown` represents an unknown type that requires explicit type assertion or narrowing (e.g., `typeof val2 === "string"`) before properties or methods can be safely accessed.'
  },
  {
    id: 'bh-24',
    category: 'C++ / OOP',
    question: 'What is the phenomenon called when a derived class object is assigned to a base class object by value?',
    codeSnippet: `class Base { public: int x; };\nclass Derived : public Base { public: int y; };\nDerived d;\nBase b = d; // What happens to member y?`,
    options: [
      'Object Slicing: member y is discarded because Base only has storage for x',
      'Dynamic Polymorphism: Base inherits member y at runtime',
      'Compile-time Error: derived types cannot be assigned to base variables',
      'Memory corruption due to struct padding misalignment'
    ],
    correctAnswer: 'Object Slicing: member y is discarded because Base only has storage for x',
    explanation: 'When passing or assigning derived objects by value to a base class variable, the derived portions (member `y` and virtual table pointers) are "sliced off" because the base object only has sufficient memory for base members. Fix: pass by reference or pointer (`Base&` or `std::unique_ptr<Base>`).'
  },
  {
    id: 'bh-25',
    category: 'Python / Generators',
    question: 'What is printed during the second loop over a Python generator expression?',
    codeSnippet: `gen = (x * 2 for x in range(3))\nprint(list(gen))\nprint(list(gen))`,
    options: [
      '[0, 2, 4] then [] (Generators are one-time iterators that are exhausted after traversal)',
      '[0, 2, 4] then [0, 2, 4] (Generators restart from the beginning when converted to list)',
      'StopIteration exception raised on second call',
      '[0, 2, 4] then None'
    ],
    correctAnswer: '[0, 2, 4] then [] (Generators are one-time iterators that are exhausted after traversal)',
    explanation: 'Generators compute values lazily and advance their internal state machine. Once the final element is yielded, the generator is exhausted. Attempting to iterate over it again immediately yields an empty collection. Fix: use a list comprehension if repeated access is required.'
  },
  {
    id: 'bh-26',
    category: 'JavaScript / JSON',
    question: 'What happens to functions and undefined properties when passed to JSON.stringify()?',
    codeSnippet: `const obj = { name: "Paperino", fn: () => {}, val: undefined };\nconsole.log(JSON.stringify(obj));`,
    options: [
      '{"name":"Paperino"} (Functions and undefined properties are omitted from object serialization)',
      '{"name":"Paperino","fn":null,"val":null}',
      'TypeError: cannot serialize callable objects to JSON',
      '{"name":"Paperino","fn":"[Function]","val":"undefined"}'
    ],
    correctAnswer: '{"name":"Paperino"} (Functions and undefined properties are omitted from object serialization)',
    explanation: 'JSON specifications only support strings, numbers, booleans, arrays, objects, and null. `JSON.stringify()` automatically omits object properties whose values are `undefined`, functions, or Symbols.'
  },
  {
    id: 'bh-27',
    category: 'React / Keys',
    question: 'Why should array indices not be used as React list keys when items can be reordered or deleted?',
    codeSnippet: `items.map((item, index) => <TodoItem key={index} text={item.text} />)`,
    options: [
      'Key stays tied to position rather than identity, causing component state corruption and UI bugs on reorder',
      'React throws an invalid key warning when index exceeds 10',
      'Array indices force complete unmounting of the entire parent DOM tree on every render',
      'Keys must be cryptographic UUID strings by specification'
    ],
    correctAnswer: 'Key stays tied to position rather than identity, causing component state corruption and UI bugs on reorder',
    explanation: 'Keys give elements a stable identity during virtual DOM reconciliation. If using array indices, deleting or reordering items shifts their indices, leading to uncontrolled input state mismatches and unnecessary re-renders. Fix: use stable unique identifiers like `item.id`.'
  },
  {
    id: 'bh-28',
    category: 'Python / Scoping',
    question: 'Why does this Python function raise an UnboundLocalError?',
    codeSnippet: `count = 10\ndef increment():\n    print(count)\n    count += 1\nincrement()`,
    options: [
      'Assignment count += 1 marks count as local to the function, causing print(count) to reference an uninitialized local variable',
      'Global variables cannot be accessed inside functions in Python',
      '+= operator is not supported on integers in Python 3',
      'Missing return statement in function body'
    ],
    correctAnswer: 'Assignment count += 1 marks count as local to the function, causing print(count) to reference an uninitialized local variable',
    explanation: 'Because Python sees an assignment `count = ...` inside the function block, it binds `count` as a local variable for the entire function scope. The preceding `print(count)` tries to access this local variable before assignment, raising `UnboundLocalError`. Fix: declare `global count`.'
  },
  {
    id: 'bh-29',
    category: 'C++ / STL',
    question: 'What causes iterator invalidation in std::vector during a push_back loop?',
    codeSnippet: `std::vector<int> v = {1, 2, 3};\nfor (auto it = v.begin(); it != v.end(); ++it) {\n    if (*it == 2) v.push_back(42);\n}`,
    options: [
      'push_back may reallocate the vector\'s underlying dynamic memory, leaving existing iterators pointing to freed memory',
      'std::vector iterators are const by default and disallow push_back',
      'Range-based loops are required for any vector modifications',
      'push_back automatically increments iterators by 2'
    ],
    correctAnswer: 'push_back may reallocate the vector\'s underlying dynamic memory, leaving existing iterators pointing to freed memory',
    explanation: 'When `push_back` causes the vector size to exceed its capacity, a new larger memory block is allocated, elements are copied over, and the old buffer is deleted. This invalidates all existing iterators, pointers, and references, causing undefined behavior or segmentation faults.'
  },
  {
    id: 'bh-30',
    category: 'Java / Concurrency',
    question: 'What problem does the volatile keyword solve in multithreaded Java applications?',
    codeSnippet: `private volatile boolean running = true;\npublic void stop() { running = false; }`,
    options: [
      'Guarantees memory visibility: writes to running are immediately flushed and read directly from main memory by all threads',
      'Acquires an exclusive reentrant mutex lock on the object',
      'Prevents the variable from being garbage collected',
      'Converts the boolean value into an atomic 64-bit integer'
    ],
    correctAnswer: 'Guarantees memory visibility: writes to running are immediately flushed and read directly from main memory by all threads',
    explanation: 'Without `volatile`, threads may cache variable values in CPU registers or L1/L2 caches. Changes made by one thread might never become visible to other threads. `volatile` establishes a happens-before memory relationship ensuring direct read/write from main memory.'
  }
];

// ============================================================================
// === 2. NUMBER DETECTIVE QUESTION POOL (30 ALGORITHMIC SEQUENCES) ==========
// ============================================================================
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
  },
  {
    id: 'nd-7',
    category: 'Fibonacci Series',
    question: 'Find the next number in this Fibonacci progression:\n0, 1, 1, 2, 3, 5, 8, 13, ?',
    options: ['21', '20', '22', '19'],
    correctAnswer: '21',
    explanation: 'In the Fibonacci sequence, each term is the sum of the two preceding terms: 8 + 13 = 21.'
  },
  {
    id: 'nd-8',
    category: 'Exponential Increments',
    question: 'Identify the next term in the progression:\n3, 5, 9, 17, 33, ?',
    options: ['65', '66', '64', '57'],
    correctAnswer: '65',
    explanation: 'The differences double each time: +2, +4, +8, +16, and next difference is +32. 33 + 32 = 65. Formula: 2^n + 1.'
  },
  {
    id: 'nd-9',
    category: 'Powers of 2',
    question: 'Complete the sequence:\n7, 14, 28, 56, 112, ?',
    options: ['224', '212', '228', '196'],
    correctAnswer: '224',
    explanation: 'Each term is multiplied by 2: 112 × 2 = 224.'
  },
  {
    id: 'nd-10',
    category: 'Perfect Squares',
    question: 'What is the missing term?\n1, 4, 9, 16, 25, 36, ?',
    options: ['49', '48', '50', '64'],
    correctAnswer: '49',
    explanation: 'The sequence consists of consecutive perfect squares n²: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25, 6²=36, 7²=49.'
  },
  {
    id: 'nd-11',
    category: 'Geometric Tripling',
    question: 'What completes this sequence?\n2, 6, 18, 54, 162, ?',
    options: ['486', '324', '450', '512'],
    correctAnswer: '486',
    explanation: 'Each term is multiplied by 3 (geometric progression with r = 3): 162 × 3 = 486.'
  },
  {
    id: 'nd-12',
    category: 'Linear Recurrence',
    question: 'Find the next number:\n5, 11, 23, 47, 95, ?',
    options: ['191', '190', '189', '195'],
    correctAnswer: '191',
    explanation: 'The recurrence relation is a(n) = 2 × a(n-1) + 1. (5×2+1=11, 11×2+1=23, 23×2+1=47, 47×2+1=95, and 95×2+1 = 191).'
  },
  {
    id: 'nd-13',
    category: 'Decreasing Squares',
    question: 'What comes next in this descending series?\n100, 99, 95, 86, 70, ?',
    options: ['45', '55', '50', '49'],
    correctAnswer: '45',
    explanation: 'The subtracted values are consecutive squares: -1² (-1), -2² (-4), -3² (-9), -4² (-16). The next subtraction is -5² (-25): 70 - 25 = 45.'
  },
  {
    id: 'nd-14',
    category: 'Mersenne Numbers',
    question: 'What is the next number in this binary sequence?\n1, 3, 7, 15, 31, 63, ?',
    options: ['127', '128', '126', '125'],
    correctAnswer: '127',
    explanation: 'The formula is 2^n - 1: 2¹-1=1, 2²-1=3, 2³-1=7, 2⁴-1=15, 2⁵-1=31, 2⁶-1=63, and 2⁷-1 = 127.'
  },
  {
    id: 'nd-15',
    category: 'Sum of Powers',
    question: 'Identify the pattern and missing value:\n2, 12, 36, 80, 150, ?',
    options: ['252', '240', '216', '260'],
    correctAnswer: '252',
    explanation: 'The formula is n² + n³: 1+1=2, 4+8=12, 9+27=36, 16+64=80, 25+125=150. For n=6: 6² + 6³ = 36 + 216 = 252.'
  },
  {
    id: 'nd-16',
    category: 'Factorial Sequence',
    question: 'What is the next value in the factorial sequence?\n1, 2, 6, 24, 120, ?',
    options: ['720', '600', '840', '500'],
    correctAnswer: '720',
    explanation: 'These are consecutive factorials n!: 1!=1, 2!=2, 3!=6, 4!=24, 5!=120, and 6! = 120 × 6 = 720.'
  },
  {
    id: 'nd-17',
    category: 'Second Differences',
    question: 'Find the next number in the quadratic series:\n4, 7, 12, 19, 28, 39, ?',
    options: ['52', '50', '51', '53'],
    correctAnswer: '52',
    explanation: 'First differences are consecutive odd numbers: +3, +5, +7, +9, +11. The next difference is +13: 39 + 13 = 52. Formula: n² + 3.'
  },
  {
    id: 'nd-18',
    category: 'Consecutive Cubes',
    question: 'What completes this series of cubes?\n8, 27, 64, 125, 216, ?',
    options: ['343', '324', '350', '512'],
    correctAnswer: '343',
    explanation: 'Cubes of integers starting from 2: 2³=8, 3³=27, 4³=64, 5³=125, 6³=216. Next is 7³ = 343.'
  },
  {
    id: 'nd-19',
    category: 'Difference of Squares',
    question: 'What is the next number?\n3, 8, 15, 24, 35, 48, ?',
    options: ['63', '60', '64', '59'],
    correctAnswer: '63',
    explanation: 'The pattern is n² - 1 for n = 2, 3, 4, 5, 6, 7, 8. For n=8: 8² - 1 = 64 - 1 = 63.'
  },
  {
    id: 'nd-20',
    category: 'Powers of 2 Halving',
    question: 'Complete the sequence:\n64, 32, 16, 8, 4, ?',
    options: ['2', '1', '0', '3'],
    correctAnswer: '2',
    explanation: 'Each number is divided by 2: 4 / 2 = 2.'
  },
  {
    id: 'nd-21',
    category: 'Pyramidal Series',
    question: 'What is the next square pyramidal number?\n1, 5, 14, 30, 55, 91, ?',
    options: ['140', '135', '144', '150'],
    correctAnswer: '140',
    explanation: 'The differences are consecutive squares: +4 (2²), +9 (3²), +16 (4²), +25 (5²), +36 (6²). The next difference is +49 (7²): 91 + 49 = 140.'
  },
  {
    id: 'nd-22',
    category: 'Prime Gaps',
    question: 'What is the prime number following 31?\n11, 13, 17, 19, 23, 29, 31, ?',
    options: ['37', '33', '35', '39'],
    correctAnswer: '37',
    explanation: 'The list represents consecutive primes. 33 (3×11), 35 (5×7), and 39 (3×13) are composite numbers. The next prime is 37.'
  },
  {
    id: 'nd-23',
    category: 'Binary Byte Weights',
    question: 'What is the next power of 2?\n2, 4, 8, 16, 32, 64, ?',
    options: ['128', '120', '124', '256'],
    correctAnswer: '128',
    explanation: 'Each term represents 2^n: 64 × 2 = 128.'
  },
  {
    id: 'nd-24',
    category: 'Double Minus Two',
    question: 'Find the next number in this sequence:\n10, 18, 34, 66, 130, ?',
    options: ['258', '260', '256', '250'],
    correctAnswer: '258',
    explanation: 'Each number is multiplied by 2 minus 2: 10×2-2=18, 18×2-2=34, 34×2-2=66, 66×2-2=130, and 130×2-2 = 258. (Differences double: +8, +16, +32, +64, +128).'
  },
  {
    id: 'nd-25',
    category: 'Arithmetic Progression',
    question: 'What is the next number?\n50, 45, 40, 35, 30, ?',
    options: ['25', '20', '28', '24'],
    correctAnswer: '25',
    explanation: 'Linear arithmetic progression decreasing by common difference d = -5: 30 - 5 = 25.'
  },
  {
    id: 'nd-26',
    category: 'Multiplicative Chain',
    question: 'Each term is the product of the previous two:\n2, 3, 6, 18, 108, ?',
    options: ['1944', '1800', '1296', '2048'],
    correctAnswer: '1944',
    explanation: '2×3=6, 3×6=18, 6×18=108. The next term is 18 × 108 = 1944.'
  },
  {
    id: 'nd-27',
    category: 'Powers of Ten',
    question: 'What comes next in the logarithmic scale?\n1, 10, 100, 1000, ?',
    options: ['10000', '100000', '5000', '2000'],
    correctAnswer: '10000',
    explanation: 'Each term is multiplied by 10 (10^n): 1000 × 10 = 10000.'
  },
  {
    id: 'nd-28',
    category: 'Consecutive Squares',
    question: 'Identify the next square number:\n9, 16, 25, 36, 49, 64, ?',
    options: ['81', '75', '80', '100'],
    correctAnswer: '81',
    explanation: 'Squares of integers 3, 4, 5, 6, 7, 8. Next is 9² = 81.'
  },
  {
    id: 'nd-29',
    category: 'Alternating Powers',
    question: 'Crack this alternating square and cube pattern:\n1, 4, 27, 16, 125, 36, ?',
    options: ['343', '49', '216', '128'],
    correctAnswer: '343',
    explanation: 'Odd positions are cubes (1³=1, 3³=27, 5³=125, 7³=343), while even positions are squares (2²=4, 4²=16, 6²=36). The 7th position is 7³ = 343.'
  },
  {
    id: 'nd-30',
    category: 'Repdigit Progression',
    question: 'Find the next term:\n12, 23, 34, 45, 56, ?',
    options: ['67', '68', '65', '78'],
    correctAnswer: '67',
    explanation: 'Arithmetic progression with constant addition of +11: 56 + 11 = 67.'
  }
];

// ============================================================================
// === 3. LOGIC MASTER QUESTION POOL (30 DEDUCTIVE & REASONING PUZZLES) ======
// ============================================================================
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
  },
  {
    id: 'lm-6',
    category: 'Probability & Games',
    question: 'In the classic Monty Hall problem with 3 doors, what is your probability of winning the car if you switch doors after the host reveals a goat?',
    options: ['2/3 (66.7%)', '1/2 (50%)', '1/3 (33.3%)', '3/4 (75%)'],
    correctAnswer: '2/3 (66.7%)',
    explanation: 'Your initial choice had a 1/3 chance of having the car, meaning there was a 2/3 chance the car was behind one of the other two doors. Because the host intentionally reveals a goat, switching captures the entire 2/3 probability.'
  },
  {
    id: 'lm-7',
    category: 'Knights & Knaves',
    question: 'On an island, Knights always tell the truth and Knaves always lie. Person A says: "We are both knaves." What are Person A and Person B?',
    options: [
      'A is a Knave, B is a Knight',
      'Both are Knights',
      'Both are Knaves',
      'A is a Knight, B is a Knave'
    ],
    correctAnswer: 'A is a Knave, B is a Knight',
    explanation: 'If A were a Knight, his statement "We are both knaves" would have to be true, which is contradictory. Thus A is a Knave. Since A is a Knave, his statement is false, meaning they are NOT both knaves, so B must be a Knight.'
  },
  {
    id: 'lm-8',
    category: 'Boolean Equivalences',
    question: 'By De Morgan\'s Law, the logical negation of (A AND B) is equivalent to:',
    options: [
      '(NOT A) OR (NOT B)',
      '(NOT A) AND (NOT B)',
      'NOT (A OR B)',
      'A OR B'
    ],
    correctAnswer: '(NOT A) OR (NOT B)',
    explanation: 'De Morgan\'s First Law states: ~(A ∧ B) ≡ ~A ∨ ~B. The negation of a conjunction is the disjunction of the negations.'
  },
  {
    id: 'lm-9',
    category: 'Pigeonhole Principle',
    question: 'A drawer contains 10 black socks and 10 white socks. What is the minimum number of socks you must pull in the dark to guarantee at least one matching pair?',
    options: ['3', '2', '11', '10'],
    correctAnswer: '3',
    explanation: 'There are only 2 possible colors (black and white). By the Pigeonhole Principle, pulling n + 1 = 2 + 1 = 3 socks guarantees that at least two of them share the same color.'
  },
  {
    id: 'lm-10',
    category: 'Combinatorics',
    question: 'At a tech meetup with 10 engineers, everyone shakes hands with everyone else exactly once. How many total handshakes occur?',
    options: ['45', '90', '50', '100'],
    correctAnswer: '45',
    explanation: 'The number of unique pairs from 10 participants is given by combinations C(10, 2) = (10 × 9) / 2 = 45.'
  },
  {
    id: 'lm-11',
    category: 'Logical Implication',
    question: 'Under what condition is the logical implication statement "If P, then Q" (P → Q) false?',
    options: [
      'P is True and Q is False',
      'P is False and Q is True',
      'Both P and Q are False',
      'Both P and Q are True'
    ],
    correctAnswer: 'P is True and Q is False',
    explanation: 'A conditional statement P → Q is broken only when the premise P is fulfilled (True) but the consequence Q fails to hold (False). In all other cases (including when P is False), it is vacuously true.'
  },
  {
    id: 'lm-12',
    category: 'Syllogism',
    question: 'Premise 1: All squares are rectangles.\nPremise 2: All rectangles are polygons.\nWhich conclusion is valid?',
    options: [
      'All squares are polygons',
      'All polygons are squares',
      'No square is a polygon',
      'Some rectangles are not polygons'
    ],
    correctAnswer: 'All squares are polygons',
    explanation: 'Categorical syllogism with universal affirmative premises: Squares ⊆ Rectangles ⊆ Polygons. Therefore, all squares are necessarily polygons.'
  },
  {
    id: 'lm-13',
    category: 'Clock Geometry',
    question: 'What is the angle between the hands of a clock at exactly 6:00?',
    options: ['180°', '90°', '120°', '360°'],
    correctAnswer: '180°',
    explanation: 'At 6:00, the minute hand points directly at 12 (0°) and the hour hand points directly at 6 (180°). The angle between them forms a straight line of 180°.'
  },
  {
    id: 'lm-14',
    category: 'Binary Search Bounds',
    question: 'What is the maximum number of comparisons required to find an element in a sorted list of 1,024 items using Binary Search?',
    options: ['10', '11', '1024', '512'],
    correctAnswer: '10',
    explanation: 'Binary Search halves the search space on each comparison. log₂(1024) = 10, meaning at most 10 comparisons are needed in the worst case.'
  },
  {
    id: 'lm-15',
    category: 'River Crossing Logic',
    question: 'Four people must cross a dark rope bridge with one torch in 1, 2, 5, and 10 minutes. At most two can cross at once at the speed of the slower person. What is the minimum time needed for all 4 to cross?',
    options: ['17 minutes', '19 minutes', '15 minutes', '21 minutes'],
    correctAnswer: '17 minutes',
    explanation: '1 & 2 cross (2m) -> 1 returns with torch (1m, total 3) -> 5 & 10 cross together (10m, total 13) -> 2 returns with torch (2m, total 15) -> 1 & 2 cross together (2m, total 17 minutes).'
  },
  {
    id: 'lm-16',
    category: 'Set Theory',
    question: 'In a class of 50 students, 30 like Python, 25 like C++, and 10 like both. How many students like neither Python nor C++?',
    options: ['5', '10', '15', '0'],
    correctAnswer: '5',
    explanation: 'Using the principle of inclusion-exclusion: |Python ∪ C++| = 30 + 25 - 10 = 45 students like at least one language. Those who like neither = 50 - 45 = 5.'
  },
  {
    id: 'lm-17',
    category: 'Graph Theory',
    question: 'What is the minimum number of colors needed to color any bipartite graph such that no two adjacent vertices share the same color?',
    options: ['2', '3', '4', '1'],
    correctAnswer: '2',
    explanation: 'By definition, the vertices of a bipartite graph can be partitioned into two disjoint independent sets U and V where every edge connects a vertex in U to V. Thus, exactly 2 colors suffice.'
  },
  {
    id: 'lm-18',
    category: 'Weighing Balance Riddle',
    question: 'You have 9 identical-looking gold coins, but one is counterfeit and slightly heavier. What is the minimum number of weighings on a balance scale to guarantee finding the fake coin?',
    options: ['2', '3', '4', '1'],
    correctAnswer: '2',
    explanation: 'Divide the 9 coins into 3 groups of 3 (3, 3, 3). Weigh group 1 against group 2 (1st weighing). The heavier group identifies the 3 suspect coins. Weigh 1 coin against 1 from the suspect group (2nd weighing) to pinpoint the fake.'
  },
  {
    id: 'lm-19',
    category: 'Deductive Rules',
    question: 'Premise: "If it rains, the server room is cooled."\nFact: "The server room is not cooled."\nWhat valid conclusion follows by Modus Tollens?',
    options: ['It did not rain', 'It rained', 'The server room is offline', 'No conclusion can be drawn'],
    correctAnswer: 'It did not rain',
    explanation: 'Modus Tollens states that if P → Q and ¬Q are true, then ¬P must be true. Since the server room is not cooled (¬Q), it did not rain (¬P).'
  },
  {
    id: 'lm-20',
    category: 'Coin Riddle',
    question: 'Two US coins add up to 30 cents, and one of them is not a nickel. What are the two coins?',
    options: [
      'A quarter (25¢) and a nickel (5¢)',
      'Two dimes and two nickels',
      'Three dimes',
      'Impossible riddle'
    ],
    correctAnswer: 'A quarter (25¢) and a nickel (5¢)',
    explanation: 'One of the coins is a quarter (which is not a nickel), and the *other* coin is a nickel. The statement "one of them is not a nickel" is completely satisfied by the quarter.'
  },
  {
    id: 'lm-21',
    category: 'Minimum Spanning Trees',
    question: 'A connected undirected graph has 8 vertices. How many edges does its Minimum Spanning Tree (MST) contain?',
    options: ['7', '8', '14', '6'],
    correctAnswer: '7',
    explanation: 'Any tree spanning N vertices contains exactly N - 1 edges with no cycles. For 8 vertices, the MST contains 8 - 1 = 7 edges.'
  },
  {
    id: 'lm-22',
    category: 'Modular Arithmetic',
    question: 'What is the remainder when (17 × 23) is divided by 5?',
    options: ['1', '2', '3', '4'],
    correctAnswer: '1',
    explanation: 'Using modular congruence: 17 ≡ 2 (mod 5) and 23 ≡ 3 (mod 5). Therefore, (17 × 23) ≡ (2 × 3) = 6 ≡ 1 (mod 5).'
  },
  {
    id: 'lm-23',
    category: 'Probability',
    question: 'If you flip two fair coins, what is the probability of getting at least one head?',
    options: ['3/4 (75%)', '1/2 (50%)', '1/4 (25%)', '2/3 (66.7%)'],
    correctAnswer: '3/4 (75%)',
    explanation: 'The 4 equally likely outcomes are {HH, HT, TH, TT}. The only outcome without any heads is TT (1/4). The complement is 1 - 1/4 = 3/4 (75%).'
  },
  {
    id: 'lm-24',
    category: 'Sorting Lower Bound',
    question: 'What is the theoretical lower bound for comparison-based sorting algorithms in the worst case?',
    options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
    correctAnswer: 'O(n log n)',
    explanation: 'A comparison sort can be modeled as a decision tree with n! leaves. The minimum height of a binary tree with n! leaves is log₂(n!) = Ω(n log n) by Stirling\'s approximation.'
  },
  {
    id: 'lm-25',
    category: 'Truth Tellers',
    question: 'If Alice says "Bob is telling the truth" and Bob says "Alice and I are of different types (one truth-teller, one liar)", what is Bob?',
    options: ['Bob is a Liar', 'Bob is a Truth-teller', 'Both are Truth-tellers', 'Paradox (indeterminate)'],
    correctAnswer: 'Bob is a Liar',
    explanation: 'If Alice were a truth-teller, Bob would be a truth-teller (per Alice\'s statement), but Bob claims they are different types, a contradiction. Thus Alice is a liar, meaning Bob is also a liar.'
  },
  {
    id: 'lm-26',
    category: 'Water Jug Problem',
    question: 'Given an empty 3-liter jug and an empty 5-liter jug, how many liters can you accurately measure without markings?',
    options: ['Any integer from 1 to 5 liters', 'Only 3 and 5 liters', 'Only even numbers (2, 4)', 'Only 8 liters'],
    correctAnswer: 'Any integer from 1 to 5 liters',
    explanation: 'Because gcd(3, 5) = 1, Bézout\'s identity guarantees that any integer linear combination can be measured: 1L (2×3 - 5), 2L (5 - 3), 3L, 4L (2×5 - 2×3), and 5L.'
  },
  {
    id: 'lm-27',
    category: 'Network Topologies',
    question: 'In a full mesh network topology with 6 nodes, how many total direct communication links exist?',
    options: ['15', '30', '12', '36'],
    correctAnswer: '15',
    explanation: 'In a mesh network, every node connects to every other node: n(n - 1) / 2 = 6 × 5 / 2 = 15 duplex links.'
  },
  {
    id: 'lm-28',
    category: 'Transitive Speed Chains',
    question: 'Alg X is faster than Y. Alg Z is slower than Y. Alg W is faster than X. Which algorithm is the slowest?',
    options: ['Algorithm Z', 'Algorithm Y', 'Algorithm X', 'Algorithm W'],
    correctAnswer: 'Algorithm Z',
    explanation: 'Establishing the speed inequality order: W > X > Y > Z. Algorithm Z is strictly the slowest.'
  },
  {
    id: 'lm-29',
    category: 'Cryptarithmetic Logic',
    question: 'In the base-10 addition puzzle: A + A = B, and B + B = C. If A = 2, what is C?',
    options: ['8', '4', '6', '10'],
    correctAnswer: '8',
    explanation: 'If A = 2, then B = 2 + 2 = 4. Then C = B + B = 4 + 4 = 8.'
  },
  {
    id: 'lm-30',
    category: 'Recursion Depth',
    question: 'What is the maximum call stack depth for computing factorial(5) using standard linear recursion?',
    options: ['5', '6', '120', '1'],
    correctAnswer: '5',
    explanation: 'Linear recursion calls factorial(5) → (4) → (3) → (2) → (1), reaching a maximum stack frame depth of 5 before unwinding and computing products.'
  }
];

// ============================================================================
// === 4. CODE BREAKER QUESTION POOL (30 CRYPTO & BINARY PUZZLES) ===========
// ============================================================================
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
  },
  {
    id: 'cb-7',
    category: 'Two\'s Complement',
    question: 'What is the 8-bit two\'s complement representation of -1 in hexadecimal?',
    options: ['0xFF', '0x80', '0x01', '0xFE'],
    correctAnswer: '0xFF',
    explanation: 'In 8-bit two\'s complement, -1 is represented with all bits set to 1: 11111111 in binary, which corresponds to 0xFF in hexadecimal.'
  },
  {
    id: 'cb-8',
    category: 'ASCII Encoding',
    question: 'What is the hexadecimal value of the ASCII character \'A\'?',
    options: ['0x41', '0x61', '0x20', '0x30'],
    correctAnswer: '0x41',
    explanation: 'Uppercase \'A\' has decimal ASCII code 65. 65 in hexadecimal is 0x41 (4 × 16 + 1 = 65). (Lowercase \'a\' is 0x61 = 97).'
  },
  {
    id: 'cb-9',
    category: 'Bit Manipulation Tricks',
    question: 'What does the bitwise expression n & (n - 1) do?',
    options: [
      'Clears the lowest set bit (rightmost 1-bit) in n',
      'Inverts all bits of n',
      'Multiplies n by 2',
      'Determines if n is negative'
    ],
    correctAnswer: 'Clears the lowest set bit (rightmost 1-bit) in n',
    explanation: 'Subtracting 1 from n flips the rightmost set bit and all bits to its right. Performing bitwise AND with n zeroes out that lowest set bit (used in Brian Kernighan\'s algorithm to count set bits).'
  },
  {
    id: 'cb-10',
    category: 'Cryptography',
    question: 'Which of the following is an asymmetric public-key cryptographic algorithm?',
    options: ['RSA', 'AES-256', 'DES', 'ChaCha20'],
    correctAnswer: 'RSA',
    explanation: 'RSA uses a pair of mathematically linked keys (a public key for encryption and a private key for decryption). AES, DES, and ChaCha20 are symmetric ciphers using a single shared secret key.'
  },
  {
    id: 'cb-11',
    category: 'Hash Functions',
    question: 'What is it called when two distinct inputs produce the identical cryptographic hash output?',
    options: ['Hash Collision', 'Rainbow Overflow', 'Entropy Inversion', 'Avalanche Flaw'],
    correctAnswer: 'Hash Collision',
    explanation: 'A hash collision occurs when x ≠ y but hash(x) = hash(y). Strong cryptographic hash algorithms like SHA-256 are engineered to be collision-resistant.'
  },
  {
    id: 'cb-12',
    category: 'Hexadecimal Math',
    question: 'Convert hexadecimal 0x100 to decimal:',
    options: ['256', '100', '512', '160'],
    correctAnswer: '256',
    explanation: '0x100 = (1 × 16²) + (0 × 16¹) + (0 × 16⁰) = 256 in decimal.'
  },
  {
    id: 'cb-13',
    category: 'Bitwise Right Shift',
    question: 'Evaluate the arithmetic right shift: 32 >> 3',
    options: ['4', '8', '2', '6'],
    correctAnswer: '4',
    explanation: 'Right shifting an integer by k bits is equivalent to integer division by 2^k: 32 / (2³) = 32 / 8 = 4.'
  },
  {
    id: 'cb-14',
    category: 'Algorithm Complexity',
    question: 'What is the worst-case time complexity of Merge Sort on an array of size n?',
    options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
    correctAnswer: 'O(n log n)',
    explanation: 'Merge Sort consistently divides the array into halves (log n levels) and performs O(n) merge work at each level, guaranteeing O(n log n) runtime in best, average, and worst cases.'
  },
  {
    id: 'cb-15',
    category: 'XOR Cipher Inversion',
    question: 'Given ciphertext C = M ^ K where M is the message and K is the key, how is the original message M recovered?',
    options: ['C ^ K', 'C & K', 'C | K', '~C'],
    correctAnswer: 'C ^ K',
    explanation: 'Because bitwise XOR is self-inverting (x ^ y ^ y = x), decrypting ciphertext C with the same key K recovers M: (M ^ K) ^ K = M.'
  },
  {
    id: 'cb-16',
    category: 'Endianness',
    question: 'In Little-Endian byte order, how is the 32-bit integer 0x12345678 arranged in consecutive memory addresses?',
    options: ['0x78, 0x56, 0x34, 0x12', '0x12, 0x34, 0x56, 0x78', '0x12, 0x78, 0x34, 0x56', '0x56, 0x78, 0x12, 0x34'],
    correctAnswer: '0x78, 0x56, 0x34, 0x12',
    explanation: 'Little-Endian stores the least significant byte (0x78) at the lowest memory address, followed in order by 0x56, 0x34, and 0x12.'
  },
  {
    id: 'cb-17',
    category: 'Base64 Encoding',
    question: 'How much does Base64 encoding expand the byte size of raw binary data?',
    options: ['Approximately 33%', 'Exactly 50%', 'Exactly 100%', '0% (No size expansion)'],
    correctAnswer: 'Approximately 33%',
    explanation: 'Base64 represents 3 binary bytes (24 bits) using 4 ASCII characters (4 bytes of 6 bits each). The ratio 4/3 represents an overhead of ~33.3%.'
  },
  {
    id: 'cb-18',
    category: 'Bit Masking',
    question: 'Which bitwise operation checks whether the 4th bit (index 3) of an integer n is set?',
    options: ['(n & (1 << 3)) != 0', '(n | (1 << 3)) == 0', 'n ^ 3', 'n >> 4 == 1'],
    correctAnswer: '(n & (1 << 3)) != 0',
    explanation: '`1 << 3` creates a mask with only the 4th bit set (0b1000 = 8). Performing `n & (1 << 3)` isolates that bit; if it is non-zero, the bit is set.'
  },
  {
    id: 'cb-19',
    category: 'Binary Addition',
    question: 'What is the sum of binary 1011 + 0101?',
    options: ['10000', '1110', '1111', '10001'],
    correctAnswer: '10000',
    explanation: '1011 in decimal is 11. 0101 in decimal is 5. 11 + 5 = 16. In binary, 16 is 10000.'
  },
  {
    id: 'cb-20',
    category: 'SHA Digest Size',
    question: 'How many hexadecimal characters are in a SHA-256 hash digest?',
    options: ['64', '32', '128', '256'],
    correctAnswer: '64',
    explanation: 'SHA-256 produces a 256-bit output. Since each hexadecimal character represents 4 bits, 256 / 4 = 64 hex characters.'
  },
  {
    id: 'cb-21',
    category: 'Bitwise NOT',
    question: 'In standard 32-bit two\'s complement signed arithmetic, what is the value of ~0?',
    options: ['-1', '0', '1', '2147483647'],
    correctAnswer: '-1',
    explanation: 'The bitwise NOT operator inverts all bits. Inverting 0 (all 0s) yields all 1s (0xFFFFFFFF), which represents -1 in two\'s complement.'
  },
  {
    id: 'cb-22',
    category: 'Power of Two Test',
    question: 'Which efficient one-line check determines if a positive integer n is a power of 2?',
    options: [
      '(n & (n - 1)) == 0',
      '(n | (n - 1)) == 0',
      'n % 2 == 0',
      '(n ^ (n + 1)) == 0'
    ],
    correctAnswer: '(n & (n - 1)) == 0',
    explanation: 'A power of 2 has exactly one binary bit set (e.g. 8 is 1000). Subtracting 1 yields all 1s below it (7 is 0111). Their bitwise AND is always 0.'
  },
  {
    id: 'cb-23',
    category: 'Hex to Dec Byte',
    question: 'What is hexadecimal 0xFF in decimal?',
    options: ['255', '256', '128', '254'],
    correctAnswer: '255',
    explanation: '0xFF = (15 × 16¹) + (15 × 16⁰) = 240 + 15 = 255.'
  },
  {
    id: 'cb-24',
    category: 'Caesar Cipher',
    question: 'Encrypt the word "CODE" using a Caesar cipher with a shift of +3:',
    options: ['FRGH', 'ERGH', 'FQGH', 'FSHI'],
    correctAnswer: 'FRGH',
    explanation: 'Shifting each letter by 3 positions: C (+3) = F, O (+3) = R, D (+3) = G, E (+3) = H. Result is FRGH.'
  },
  {
    id: 'cb-25',
    category: 'XOR Swap Algorithm',
    question: 'What is the state of variables a and b after executing: a ^= b; b ^= a; a ^= b;?',
    options: [
      'The values of a and b are swapped without temporary memory',
      'Both a and b become 0',
      'Both a and b hold the sum of initial values',
      'The operation causes an integer overflow exception'
    ],
    correctAnswer: 'The values of a and b are swapped without temporary memory',
    explanation: 'This is the classical XOR swap algorithm. It swaps the values of two variables using three bitwise XOR operations without requiring auxiliary storage.'
  },
  {
    id: 'cb-26',
    category: 'Hash Map Lookup',
    question: 'What is the average time complexity of a key lookup in a Hash Table with a uniform hash function?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctAnswer: 'O(1)',
    explanation: 'With a well-distributed hash function and appropriate load factor, bucket access and retrieval occurs in constant O(1) time.'
  },
  {
    id: 'cb-27',
    category: 'Integer Limits',
    question: 'What is the maximum unsigned value that can be represented by a 16-bit integer?',
    options: ['65,535', '32,767', '65,536', '131,072'],
    correctAnswer: '65,535',
    explanation: 'An unsigned 16-bit integer can store values from 0 to 2¹⁶ - 1 = 65,535.'
  },
  {
    id: 'cb-28',
    category: 'Decimal to Binary',
    question: 'Convert decimal 42 to binary representation:',
    options: ['101010', '101100', '110010', '100110'],
    correctAnswer: '101010',
    explanation: '42 = 32 + 8 + 2 = (1×32) + (0×16) + (1×8) + (0×4) + (1×2) + (0×1) = 101010 in binary.'
  },
  {
    id: 'cb-29',
    category: 'Network Ports',
    question: 'What is the standard port number for secure HTTPS communication?',
    options: ['443', '80', '8080', '22'],
    correctAnswer: '443',
    explanation: 'HTTPS traffic uses port 443 by default (HTTP uses port 80, SSH uses port 22).'
  },
  {
    id: 'cb-30',
    category: 'Bit Parity',
    question: 'What is the parity bit (even parity) for the 7-bit binary data 1011001?',
    options: ['0 (Total 1s is already 4, which is even)', '1', 'Cannot be determined', '7'],
    correctAnswer: '0 (Total 1s is already 4, which is even)',
    explanation: 'In even parity, the parity bit is chosen so that the total count of 1-bits is even. The data 1011001 contains four 1s (an even number), so the parity bit is 0.'
  }
];

// ============================================================================
// === 5. CIRCUIT MASTER CIRCUITS (16 DIGITAL LOGIC CIRCUITS) ================
// ============================================================================
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
  },
  {
    id: 'cm-5',
    title: 'Half Adder Sum Gate',
    expression: 'Output = A XOR B',
    inputs: ['A', 'B'],
    targetOutput: 1,
    explanation: 'The Sum output of a binary Half Adder is the XOR of inputs A and B. It outputs 1 when exactly one input is 1 and the other is 0.',
    validate: (inputs) => {
      const out = (inputs.A !== inputs.B) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-6',
    title: 'OR-NAND Inverted Circuit',
    expression: 'Output = (A OR B) NAND C',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'A NAND gate produces 1 in all cases except when both branches are 1. Setting C=0 guarantees an output of 1 regardless of A and B.',
    validate: (inputs) => {
      const branch1 = (inputs.A === 1 || inputs.B === 1) ? 1 : 0;
      const out = !(branch1 === 1 && inputs.C === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-7',
    title: '3-Input Majority Voter Gate',
    expression: 'Output = (A AND B) OR (B AND C) OR (A AND C)',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'The majority voter logic outputs 1 whenever at least two of the three inputs A, B, and C are 1.',
    validate: (inputs) => {
      const count = (inputs.A === 1 ? 1 : 0) + (inputs.B === 1 ? 1 : 0) + (inputs.C === 1 ? 1 : 0);
      const out = count >= 2 ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-8',
    title: 'Universal Dual NOR Gate',
    expression: 'Output = NOT (A OR B)',
    inputs: ['A', 'B'],
    targetOutput: 1,
    explanation: 'A NOR gate outputs 1 only when all inputs are 0. If either A or B is 1, the NOR output drops to 0.',
    validate: (inputs) => {
      const out = (inputs.A === 0 && inputs.B === 0) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-9',
    title: 'Equivalence (XNOR) Gate',
    expression: 'Output = NOT (A XOR B)',
    inputs: ['A', 'B'],
    targetOutput: 1,
    explanation: 'The XNOR (equivalence) gate outputs 1 when both inputs are identical: either both are 0 or both are 1.',
    validate: (inputs) => {
      const out = (inputs.A === inputs.B) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-10',
    title: '2-to-1 Multiplexer (MUX)',
    expression: 'Output = (A AND (NOT S)) OR (B AND S)',
    inputs: ['A', 'B', 'S'],
    targetOutput: 1,
    explanation: 'When select line S is 0, input A is routed to the output. When S is 1, input B is routed to the output. To output 1, set A=1 and S=0, or B=1 and S=1.',
    validate: (inputs) => {
      const out = inputs.S === 0 ? (inputs.A === 1 ? 1 : 0) : (inputs.B === 1 ? 1 : 0);
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-11',
    title: '3-Bit Odd Parity Generator',
    expression: 'Output = A XOR B XOR C',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'Cascaded XOR gates output 1 when an odd number of inputs are 1 (e.g. exactly one input is 1, or all three are 1).',
    validate: (inputs) => {
      const sum = (inputs.A === 1 ? 1 : 0) + (inputs.B === 1 ? 1 : 0) + (inputs.C === 1 ? 1 : 0);
      const out = (sum % 2 === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-12',
    title: 'AND-OR-INVERT (AOI) Logic',
    expression: 'Output = NOT ((A AND B) OR (C AND D))',
    inputs: ['A', 'B', 'C', 'D'],
    targetOutput: 1,
    explanation: 'An AOI gate outputs 1 only when neither pair of AND inputs is simultaneously active: both (A AND B) and (C AND D) must be 0.',
    validate: (inputs) => {
      const pair1 = (inputs.A === 1 && inputs.B === 1);
      const pair2 = (inputs.C === 1 && inputs.D === 1);
      const out = (!pair1 && !pair2) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-13',
    title: 'Controlled Buffer Gate',
    expression: 'Output = Data AND Enable',
    inputs: ['Data', 'Enable'],
    targetOutput: 1,
    explanation: 'A controlled buffer passes data through only when the Enable signal is active (1). Both Data and Enable must be 1 to output 1.',
    validate: (inputs) => {
      const out = (inputs.Data === 1 && inputs.Enable === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-14',
    title: 'Triple-Input AND Gate',
    expression: 'Output = A AND B AND C',
    inputs: ['A', 'B', 'C'],
    targetOutput: 1,
    explanation: 'A 3-input AND gate outputs 1 only when all three switches A, B, and C are simultaneously closed (1).',
    validate: (inputs) => {
      const out = (inputs.A === 1 && inputs.B === 1 && inputs.C === 1) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-15',
    title: 'Comparator (Greater Than) Logic',
    expression: 'Output = A AND (NOT B)',
    inputs: ['A', 'B'],
    targetOutput: 1,
    explanation: 'Determines if single-bit number A is strictly greater than B. It outputs 1 only when A=1 and B=0.',
    validate: (inputs) => {
      const out = (inputs.A === 1 && inputs.B === 0) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  },
  {
    id: 'cm-16',
    title: 'Inverted Input XOR Circuit',
    expression: 'Output = (NOT A) XOR (NOT B)',
    inputs: ['A', 'B'],
    targetOutput: 1,
    explanation: 'Negating both inputs before XOR is equivalent to A XOR B: outputs 1 whenever A and B have different values.',
    validate: (inputs) => {
      const notA = inputs.A === 0 ? 1 : 0;
      const notB = inputs.B === 0 ? 1 : 0;
      const out = (notA !== notB) ? 1 : 0;
      return { output: out, isCorrect: out === 1 };
    }
  }
];

// ============================================================================
// === 6. MEMORY RUSH CONCEPT CARDS (24 DIVERSE TECH CARDS) ===================
// ============================================================================
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
  { id: 'redis', symbol: '⚡', name: 'Redis', concept: 'In-memory key-value data structure store used for caching and pub/sub message brokers' },
  { id: 'kafka', symbol: '📨', name: 'Kafka', concept: 'Distributed event streaming platform capable of handling trillions of events daily' },
  { id: 'wasm', symbol: '🌐', name: 'Wasm', concept: 'Binary instruction format for web browsers enabling near-native execution speed' },
  { id: 'go', symbol: '🐹', name: 'Go', concept: 'Concurrent systems programming language with lightweight goroutines and CSP channels' },
  { id: 'aws', symbol: '☁️', name: 'AWS', concept: 'Global cloud infrastructure platform providing on-demand compute, storage, and networking' },
  { id: 'nextjs', symbol: '▲', name: 'Next.js', concept: 'Full-stack React framework featuring SSR, Static Generation, and Server Components' },
  { id: 'git', symbol: '🌿', name: 'Git', concept: 'Distributed version control system tracking source code mutations and branching trees' },
  { id: 'linux', symbol: '🐧', name: 'Linux', concept: 'Open-source Unix-like kernel powering servers, supercomputers, and embedded devices' },
  { id: 'nginx', symbol: '🛡️', name: 'Nginx', concept: 'High-performance HTTP web server, reverse proxy, and asynchronous load balancer' },
  { id: 'pytorch', symbol: '🔥', name: 'PyTorch', concept: 'Dynamic tensor library and deep learning framework with automatic differentiation' },
  { id: 'tailwind', symbol: '🎨', name: 'Tailwind', concept: 'Utility-first CSS framework for building custom responsive user interfaces rapidly' },
  { id: 'jwt', symbol: '🎫', name: 'JWT', concept: 'Compact URL-safe cryptographically signed token standard for stateless authorization' },
  { id: 'oauth', symbol: '🔑', name: 'OAuth2', concept: 'Industry-standard authorization protocol enabling delegated access permissions' },
  { id: 'ci', symbol: '🚀', name: 'CI/CD', concept: 'Automated continuous integration and continuous deployment delivery pipeline' },
  { id: 'mongo', symbol: '🍃', name: 'MongoDB', concept: 'Document-oriented NoSQL database storing flexible BSON JSON-like data models' },
  { id: 'vite', symbol: '⚡', name: 'Vite', concept: 'Next-generation frontend build tool powered by native ES modules and Rollup/esbuild' }
];

// ============================================================================
// === 7. TYPING BLITZ CODE SNIPPETS (16 CODE EXCERPTS) =======================
// ============================================================================
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
  },
  {
    id: 'tb-4',
    title: 'Binary Search Algorithm',
    language: 'Python',
    code: 'mid = (low + high) // 2',
    explanation: 'Calculates the integer midpoint between lower and upper array bounds.'
  },
  {
    id: 'tb-5',
    title: 'SQL Aggregation',
    language: 'SQL',
    code: 'SELECT user_id, COUNT(*) FROM orders GROUP BY user_id;',
    explanation: 'Groups order records per user and tallies the total counts.'
  },
  {
    id: 'tb-6',
    title: 'Rust Pattern Matching',
    language: 'Rust',
    code: 'match result { Ok(val) => val, Err(e) => panic!(e) }',
    explanation: 'Unwraps a Result enum safely using exhaustive pattern matching.'
  },
  {
    id: 'tb-7',
    title: 'Go Goroutine Launch',
    language: 'Go',
    code: 'go func() { ch <- computeResults() }();',
    explanation: 'Spawns an asynchronous concurrent goroutine sending data through a channel.'
  },
  {
    id: 'tb-8',
    title: 'Object Destructuring',
    language: 'TypeScript',
    code: 'const { userId, isOfficial } = session;',
    explanation: 'Extracts properties directly from an object into local variables.'
  },
  {
    id: 'tb-9',
    title: 'List Comprehension',
    language: 'Python',
    code: 'squares = [x ** 2 for x in numbers if x > 0]',
    explanation: 'Builds a list of squares for all positive values in the input sequence.'
  },
  {
    id: 'tb-10',
    title: 'Docker CMD Entrypoint',
    language: 'Dockerfile',
    code: 'CMD ["node", "dist/server.js"]',
    explanation: 'Defines the default container command executed upon container startup.'
  },
  {
    id: 'tb-11',
    title: 'Promise All Settlement',
    language: 'JavaScript',
    code: 'const results = await Promise.all([taskA(), taskB()]);',
    explanation: 'Runs asynchronous tasks concurrently and settles when all complete.'
  },
  {
    id: 'tb-12',
    title: 'CSS Grid Layout',
    language: 'CSS',
    code: 'grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));',
    explanation: 'Defines a responsive fluid grid layout adapting column counts to viewport width.'
  },
  {
    id: 'tb-13',
    title: 'Pointer Dereference',
    language: 'C++',
    code: 'std::unique_ptr<Node> next = std::make_unique<Node>();',
    explanation: 'Allocates a managed node object on the heap with automatic memory deallocation.'
  },
  {
    id: 'tb-14',
    title: 'JSON Parse & Type Guard',
    language: 'TypeScript',
    code: 'const payload = JSON.parse(rawText) as ChallengePayload;',
    explanation: 'Parses a serialized JSON text stream into strongly-typed payload.'
  },
  {
    id: 'tb-15',
    title: 'Recursion Base Case',
    language: 'Python',
    code: 'if n <= 1: return 1',
    explanation: 'Terminating condition halting infinite recursive function descent.'
  },
  {
    id: 'tb-16',
    title: 'HTML Canvas Context',
    language: 'JavaScript',
    code: 'const ctx = canvas.getContext("2d");',
    explanation: 'Acquires the 2D rendering rendering engine for raster bitmap graphics.'
  }
];

// ============================================================================
// === 8. WORD FORGE WORD LIST (150+ VOCABULARY WORDS) ========================
// ============================================================================
export const WORD_LIST: string[] = [
  'algorithm', 'binary', 'compiler', 'database', 'encrypt',
  'function', 'gateway', 'hardware', 'integer', 'javascript',
  'kernel', 'library', 'malware', 'network', 'optimize',
  'protocol', 'quantum', 'runtime', 'software', 'terminal',
  'unicode', 'virtual', 'webpack', 'syntax', 'boolean',
  'variable', 'iterate', 'modular', 'parsing', 'graphic',
  'machine', 'digital', 'storage', 'compute', 'decrypt',
  'browser', 'silicon', 'circuit', 'deploy', 'python',
  'tensor', 'neural', 'server', 'docker', 'devops',
  'kotlin', 'github', 'struct', 'lambda', 'cursor',
  'firewall', 'bandwidth', 'firmware', 'hyperlink', 'interface',
  'looping', 'memory', 'operand', 'pointer', 'query',
  'router', 'segment', 'thread', 'upgrade', 'vector',
  'wireless', 'backend', 'frontend', 'cloud', 'cluster',
  'packet', 'socket', 'token', 'cache', 'proxy',
  'backup', 'buffer', 'cookie', 'driver', 'engine',
  'filter', 'format', 'header', 'inline', 'layout',
  'matrix', 'native', 'output', 'plugin', 'raster',
  'schema', 'script', 'stream', 'tables', 'uplink',
  'widget', 'client', 'crypto', 'domain', 'export',
  'folder', 'import', 'method', 'module', 'number',
  'object', 'player', 'record', 'sample', 'source',
  'target', 'unique', 'verify', 'window', 'action',
  'beacon', 'cipher', 'daemon', 'entity', 'future',
  'global', 'handle', 'invoke', 'keygen', 'loader',
  'notify', 'origin', 'portal', 'random', 'system',
  'tester', 'unlock', 'viewer', 'worker', 'atomic'
];

// ============================================================================
// === 9. THE IMPOSTOR SCENARIOS (20 DEDUCTION SCENARIOS) =====================
// ============================================================================
export const IMPOSTOR_SCENARIOS = [
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
  {
    characters: ['Liam', 'Zara', 'Owen', 'Maya'],
    clues: ['One person has the admin password.', 'Liam only has guest access.', 'Zara was granted superuser rights yesterday.', 'Owen forgot his login credentials.', 'Maya has student privileges.'],
    question: 'Who has the admin password?',
    answer: 'Zara',
    options: ['Liam', 'Zara', 'Owen', 'Maya'],
  },
  {
    characters: ['Elena', 'Victor', 'Chloe', 'Jack'],
    clues: ['Only one person solved the encryption challenge.', 'Victor could not decode the key.', 'Chloe gave up after 5 minutes.', 'Elena solved it in 90 seconds.', 'Jack did not participate.'],
    question: 'Who solved the encryption challenge?',
    answer: 'Elena',
    options: ['Elena', 'Victor', 'Chloe', 'Jack'],
  },
  {
    characters: ['Sanjay', 'Deepa', 'Rohan', 'Meera'],
    clues: ['One person committed the broken build.', 'Deepa was on leave.', 'Rohan only edits markdown docs.', 'Sanjay pushed code to main without tests.', 'Meera merged approved PRs only.'],
    question: 'Who committed the broken build?',
    answer: 'Sanjay',
    options: ['Sanjay', 'Deepa', 'Rohan', 'Meera'],
  },
  {
    characters: ['Tara', 'Neil', 'Kavya', 'Aditya'],
    clues: ['One person won the hackathon grand trophy.', 'Tara placed second.', 'Neil was a spectator.', 'Aditya came in third.', 'Kavya took the 1st place championship.'],
    question: 'Who won the hackathon grand trophy?',
    answer: 'Kavya',
    options: ['Tara', 'Neil', 'Kavya', 'Aditya'],
  },
  {
    characters: ['Lucas', 'Sophia', 'Ethan', 'Isabella'],
    clues: ['Exactly one person wrote the backend API in Rust.', 'Lucas uses Python exclusively.', 'Ethan prefers Java.', 'Sophia built the high-speed Rust microservice.', 'Isabella is a UI designer.'],
    question: 'Who wrote the backend API in Rust?',
    answer: 'Sophia',
    options: ['Lucas', 'Sophia', 'Ethan', 'Isabella'],
  },
  {
    characters: ['Manoj', 'Ananya', 'Varun', 'Swati'],
    clues: ['One person discovered the critical zero-day exploit.', 'Manoj was auditing CSS files.', 'Varun noticed nothing unusual.', 'Ananya discovered the buffer overflow flaw.', 'Swati was writing documentation.'],
    question: 'Who discovered the zero-day exploit?',
    answer: 'Ananya',
    options: ['Manoj', 'Ananya', 'Varun', 'Swati'],
  },
  {
    characters: ['Oscar', 'Ruby', 'Samir', 'Zoey'],
    clues: ['One person scored the fastest typing speed.', 'Oscar typed 65 WPM.', 'Samir typed 72 WPM.', 'Zoey typed 50 WPM.', 'Ruby clocked 115 WPM.'],
    question: 'Who had the fastest typing speed?',
    answer: 'Ruby',
    options: ['Oscar', 'Ruby', 'Samir', 'Zoey'],
  },
  {
    characters: ['Aakash', 'Bhavna', 'Chetan', 'Divya'],
    clues: ['One person holds the server root SSH key.', 'Aakash has no terminal access.', 'Bhavna holds the root SSH key.', 'Chetan has read-only FTP access.', 'Divya is an intern.'],
    question: 'Who holds the server root SSH key?',
    answer: 'Bhavna',
    options: ['Aakash', 'Bhavna', 'Chetan', 'Divya'],
  },
  {
    characters: ['Gabriel', 'Hannah', 'Ian', 'Julia'],
    clues: ['One person has completed all 14 challenges.', 'Gabriel completed 8.', 'Ian completed 12.', 'Julia completed 5.', 'Hannah achieved 100% completion across all 14.'],
    question: 'Who completed all 14 challenges?',
    answer: 'Hannah',
    options: ['Gabriel', 'Hannah', 'Ian', 'Julia'],
  },
  {
    characters: ['Pranav', 'Ritu', 'Sahil', 'Tanvi'],
    clues: ['Only one person knows the vault pin.', 'Pranav forgot the pin.', 'Sahil never saw the pin.', 'Tanvi was given a fake pin.', 'Ritu memorized the true 4-digit pin.'],
    question: 'Who knows the vault pin?',
    answer: 'Ritu',
    options: ['Pranav', 'Ritu', 'Sahil', 'Tanvi'],
  },
  {
    characters: ['Felix', 'Greta', 'Henry', 'Ivy'],
    clues: ['One person holds the golden ticket.', 'Felix holds a bronze token.', 'Henry holds silver.', 'Ivy holds wood.', 'Greta was awarded the golden ticket.'],
    question: 'Who holds the golden ticket?',
    answer: 'Greta',
    options: ['Felix', 'Greta', 'Henry', 'Ivy'],
  },
  {
    characters: ['Nikhil', 'Pooja', 'Qasim', 'Revathi'],
    clues: ['One person solved the Rubik\'s cube in under 10 seconds.', 'Nikhil took 45s.', 'Qasim took 30s.', 'Pooja took 20s.', 'Revathi set a record of 8.2 seconds.'],
    question: 'Who solved the cube in under 10 seconds?',
    answer: 'Revathi',
    options: ['Nikhil', 'Pooja', 'Qasim', 'Revathi'],
  }
];

// ============================================================================
// === 10. PARADOX CHAINS (20 INSTRUCTION OVERRIDE CHAINS) ====================
// ============================================================================
export const PARADOX_CHAINS = [
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
  {
    values: [14, 21, 35, 42],
    instructions: [
      { text: 'Select the number divisible by 7.', active: true },
      { text: 'Select the even number.', active: true },
      { text: 'Select the largest even multiple of 7.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '42',
    options: ['14', '21', '35', '42'],
  },
  {
    values: [5, 12, 19, 26],
    instructions: [
      { text: 'Select the number ending with 6.', active: true },
      { text: 'Discard: select the prime number.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '19',
    options: ['5', '12', '19', '26'],
  },
  {
    values: [10, 20, 30, 40],
    instructions: [
      { text: 'Select the maximum value.', active: true },
      { text: 'Divide the chosen number in half.', active: true },
    ],
    question: 'Which number matches the result?',
    answer: '20',
    options: ['10', '20', '30', '40'],
  },
  {
    values: [1, 4, 9, 16],
    instructions: [
      { text: 'Select the number 4.', active: true },
      { text: 'Reverse: select the number that is 4 squared.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '16',
    options: ['1', '4', '9', '16'],
  },
  {
    values: [15, 8, 22, 3],
    instructions: [
      { text: 'Select the smallest number.', active: true },
      { text: 'Nevermind: select the largest number.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '22',
    options: ['15', '8', '22', '3'],
  },
  {
    values: [2, 6, 10, 14],
    instructions: [
      { text: 'Select the number at position 1.', active: true },
      { text: 'Shift one position to the right.', active: true },
    ],
    question: 'Which number is at that position?',
    answer: '6',
    options: ['2', '6', '10', '14'],
  },
  {
    values: [11, 22, 33, 44],
    instructions: [
      { text: 'Select an odd number.', active: true },
      { text: 'Among odd numbers, select the one greater than 20.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '33',
    options: ['11', '22', '33', '44'],
  },
  {
    values: [9, 18, 27, 36],
    instructions: [
      { text: 'Select the multiple of 9 that is also divisible by 4.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '36',
    options: ['9', '18', '27', '36'],
  },
  {
    values: [50, 100, 150, 200],
    instructions: [
      { text: 'Select the highest value.', active: true },
      { text: 'Subtract 50 from your selection.', active: true },
    ],
    question: 'Which option matches this calculated value?',
    answer: '150',
    options: ['50', '100', '150', '200'],
  },
  {
    values: [7, 13, 29, 31],
    instructions: [
      { text: 'Select the smallest prime.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '7',
    options: ['7', '13', '29', '31'],
  },
  {
    values: [8, 16, 32, 64],
    instructions: [
      { text: 'Select 2 to the power of 5.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '32',
    options: ['8', '16', '32', '64'],
  },
  {
    values: [100, 250, 500, 1000],
    instructions: [
      { text: 'Select the value that is half of 500.', active: true },
    ],
    question: 'Which number should you select?',
    answer: '250',
    options: ['100', '250', '500', '1000'],
  }
];

// ============================================================================
// === 11. O(1) LOOKUP MAPS FOR FAST SERVER ANSWER VALIDATION ================
// ============================================================================
export const BUG_HUNTER_MAP = new Map<string, ArenaQuestion>(BUG_HUNTER_POOL.map(q => [q.id, q]));
export const NUMBER_DETECTIVE_MAP = new Map<string, ArenaQuestion>(NUMBER_DETECTIVE_POOL.map(q => [q.id, q]));
export const LOGIC_MASTER_MAP = new Map<string, ArenaQuestion>(LOGIC_MASTER_POOL.map(q => [q.id, q]));
export const CODE_BREAKER_MAP = new Map<string, ArenaQuestion>(CODE_BREAKER_POOL.map(q => [q.id, q]));
export const CIRCUIT_MAP = new Map<string, CircuitChallenge>(CIRCUIT_CHALLENGES.map(c => [c.id, c]));

/**
 * Deterministic PRNG helper
 */
export function seededRand(seed: number) {
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
