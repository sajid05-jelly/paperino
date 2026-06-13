import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runApiGuard } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  /* ── Security: require auth + enforce server-side daily limit ── */
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Prevent absurdly long inputs (saves Gemini quota)
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message too long. Please keep it under 1000 characters." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.7 },
    });

    const prompt = `
You are "Paperino AI", a highly intelligent and helpful student assistant for SRM University students. 
Your goal is to help them with quick academic support, such as explaining important topics, giving short summaries, suggesting exam questions, or answering basic math and GPA/CGPA doubts.

CRITICAL RULES:
1. KEEP YOUR RESPONSES EXTREMELY CONCISE AND SHORT. Under 100 words.
2. Be friendly, encouraging, and clear.
3. Answer the user's question directly and accurately. Verify all math carefully before answering.
4. DO NOT use markdown formatting like asterisks (**) or backticks (\`). Return plain text only.
5. If a user asks something completely unrelated to academics or university life, politely decline and steer them back to studying.

User Question: "${message}"

Paperino AI Response:`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Clean up any stray markdown formatting
    responseText = responseText.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "").trim();

    if (!responseText || responseText.length < 2) {
      responseText = "I couldn't generate a proper response. Please try asking your question differently.";
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI response. Please try again." },
      { status: 500 }
    );
  }
}
