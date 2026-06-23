import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";
const MAX_RETRIES = 1;

/**
 * Helper to safely retry Groq API calls on failure.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  console.log("Using Groq Llama 3.3 70B");
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`[Groq API Error] Retrying... (${retries} retries left):`, error.message);
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Standard text generation for Assistant
 */
export async function generateChatResponse(systemPrompt: string, userMessage: string): Promise<string> {
  return withRetry(async () => {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1000,
    });
    return completion.choices[0]?.message?.content || "";
  });
}

/**
 * JSON generation for ATS and PYQ Analyzers
 */
export async function generateJSONResponse(prompt: string): Promise<any> {
  return withRetry(async () => {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a specialized AI analyzer. You must respond ONLY with valid, strict JSON. Do not include markdown code blocks or any conversational text. Return the raw JSON object directly." },
        { role: "user", content: prompt },
      ],
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content || "{}";
    
    // Clean up potential markdown wrapper just in case (though response_format: json_object prevents this usually)
    const cleanedText = responseContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(cleanedText);
  });
}

/**
 * Chunked analysis for very large PYQ text.
 * Splits text into ~4000 character chunks, analyzes in parallel, and merges results.
 */
export async function analyzeLargePYQ(text: string, subject: string): Promise<any> {
  // If the text is small enough, process directly.
  if (text.length <= 15000) {
    return analyzePYQChunk(text, subject);
  }

  console.log(`[Groq] Text is very large (${text.length} chars). Chunking...`);
  
  // Very simplistic chunking strategy (split into chunks of 10000 chars)
  const chunkSize = 10000;
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }

  // Process chunks in parallel
  const chunkPromises = chunks.map((chunk, i) => {
    console.log(`[Groq] Processing chunk ${i + 1}/${chunks.length}`);
    return analyzePYQChunk(chunk, subject).catch(err => {
      console.error(`[Groq] Failed to process chunk ${i + 1}:`, err.message);
      return null;
    });
  });

  const chunkResults = await Promise.all(chunkPromises);
  const validResults = chunkResults.filter(Boolean);

  if (validResults.length === 0) {
    throw new Error("Failed to extract meaningful insights from any chunk.");
  }

  if (validResults.length === 1) {
    return validResults[0];
  }

  // Final aggregation step: Send all combined JSON summaries to Groq for a final master summary.
  const aggregationPrompt = `
You are an advanced Academic AI Predictor.
I have analyzed portions of Previous Year Question (PYQ) papers for the subject: "${subject}".
Below is an array of JSON objects representing the analysis of different chunks.

Aggregate these findings into ONE final, cohesive JSON object matching this schema exactly:
{
  "importantQuestions": [
    { "questionText": "string", "score": number, "reason": "string" }
  ],
  "importantTopics": [
    { "topic": "string", "reason": "string" }
  ],
  "predictedQuestions": [
    { "questionText": "string", "score": number, "reason": "string" }
  ],
  "unitWeightage": [
    { "unit": "string", "score": number }
  ]
}

Rules:
1. Merge identical/similar questions and recalculate an overarching importance score (1-100).
2. "importantQuestions" should contain the most frequently asked, high-weightage historical questions.
3. "predictedQuestions" should contain highly probable expected questions for the upcoming exam based on patterns.
4. "unitWeightage" should reflect the overall probability (1-100) of that unit appearing.

Raw Chunk Data:
${JSON.stringify(validResults)}
`;

  console.log(`[Groq] Aggregating ${validResults.length} chunk results into final master JSON...`);
  return generateJSONResponse(aggregationPrompt);
}

/**
 * Base PYQ Analysis Prompt
 */
async function analyzePYQChunk(textChunk: string, subject: string): Promise<any> {
  const prompt = `
You are an advanced Academic AI Predictor.
Deeply analyze the provided Previous Year Question (PYQ) paper text for the subject: "${subject}".

Do NOT simply identify repeated questions.
Identify:
1. Most important topics
2. Most important questions
3. Frequently asked concepts
4. High probability exam questions
5. Unit-wise weightage
6. Questions likely to appear again
7. Topics students must not skip

Assign each question an importance score from 1-100.
Prioritize:
- Repeated questions
- Variations of the same concept
- High-weightage units
- Core syllabus concepts

Return the result STRICTLY as a JSON object matching this schema:
{
  "importantQuestions": [
    { "questionText": "string", "score": number, "reason": "string" }
  ],
  "importantTopics": [
    { "topic": "string", "reason": "string" }
  ],
  "predictedQuestions": [
    { "questionText": "string", "score": number, "reason": "string" }
  ],
  "unitWeightage": [
    { "unit": "string", "score": number }
  ]
}

PYQ Text to Analyze:
${textChunk}
`;

  return generateJSONResponse(prompt);
}
