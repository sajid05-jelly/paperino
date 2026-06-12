import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const prompt = `You are an expert ATS Analyzer and Technical Recruiter for the role: "Software Engineer". Evaluate the resume and return STRICTLY JSON:
{
  "executiveSummary": { "topStrengths": ["string"], "topWeaknesses": ["string"] },
  "recruiterPerspective": { "strengths": ["string"], "concerns": ["string"], "hiringReadiness": number },
  "atsPassProbability": number,
  "industryBenchmark": "string",
  "topActionItems": ["string"],
  "issues": [{ "type": "weak_summary" | "missing_keyword" | "weak_project" | "missing_section" | "formatting" | "ats_compatibility", "priority": "Critical" | "Important" | "Optional", "section": "string", "message": "string", "currentText": "string", "suggestedText": "string" }]
}
IMPORTANT RULES:
- Keep all feedback concise (maximum 2-3 lines per message).
- Ensure "issues" focus on actionable text improvements.
- "industryBenchmark" should be a short phrase like "Top 10% of applicants" or "Below Average".
Resume: Software Engineer with 5 years experience in React and Node.js. Developed several web apps.`;

async function run() {
  const result = await model.generateContent(prompt);
  console.log(result.response.text());
}
run().catch(console.error);
