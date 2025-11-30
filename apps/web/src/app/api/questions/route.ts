// /app/api/questions/route.ts

import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { category } = await req.json();

    if (!category) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 }
      );
    }

    const safeCategory = String(category).trim().slice(0, 40);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite-preview-02-05",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const prompt = `
      You are an exam question generator.
      
      TASK:
      Create exactly 10 valid multiple-choice quiz questions for the category "${safeCategory}".
      
      STRICT JSON OUTPUT FORMAT:
      {
        "questions": [
          {
            "category": "${safeCategory}",
            "question": "The actual question text here?",
            "options": ["Option A Text", "Option B Text", "Option C Text", "Option D Text"],
            "answer": "Option A Text" 
          }
        ]
      }

      RULES:
      1. Return ONLY valid JSON. No Markdown, no code blocks.
      2. "options" must contain the actual text of the answers, not just "A", "B", "C", "D".
      3. "answer" must match exactly one of the strings in the "options" array.
      4. Provide exactly 10 questions.
      5. If the category is obscure, use General Knowledge.
    `;

    // Generate Content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parsing Failed:", text);
      throw new Error("Invalid JSON received from Gemini.");
    }

    // Validate structure
    if (
      !parsed.questions ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length !== 10
    ) {
      // Fallback logic: sometimes models return less than 10 if token limit hits,
      // but flash is usually good. We throw error to trigger fallback in frontend.
      throw new Error("Model did not return exactly 10 questions.");
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      {
        error: err.message || "Something went wrong generating questions.",
      },
      { status: 500 }
    );
  }
}

// // /app/api/questions/route.ts

// import { NextResponse } from "next/server";
// import OpenAI from "openai";

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export async function POST(req: Request) {
//   try {
//     const { category } = await req.json();

//     if (!category) {
//       return NextResponse.json(
//         { error: "Category is required." },
//         { status: 400 }
//       );
//     }

//     // Sanitize category (prevent chaos)
//     const safeCategory = String(category).trim().slice(0, 40);

//     const prompt = `
// You are an exam question generator.

// TASK:
// Create exactly 10 valid multiple-choice quiz questions for the category "${safeCategory}".

// STRICT RULES:
// - The response MUST be valid JSON only.
// - Do NOT include markdown.
// - Do NOT include explanations.
// - Every question MUST follow this schema exactly:

// {
//   "category": "${safeCategory}",
//   "question": "string",
//   "options": ["A", "B", "C", "D"],
//   "answer": "A"
// }

// RULES:
// - Do NOT repeat any question.
// - Options must be short and clear.
// - Answer must be one of the options.
// - If the category is unknown or unclear, assume standard general knowledge.

// FINAL OUTPUT FORMAT:
// {
//   "questions": [ ...10 questions... ]
// }
// `;

//     const completion = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       temperature: 0, // <-- For accuracy & consistency
//       response_format: { type: "json_object" },
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a strict JSON generator. You MUST return only JSON and must follow the required structure.",
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//     });

//     const content = completion.choices[0].message?.content;

//     if (!content) {
//       throw new Error("Empty response from ChatGPT.");
//     }

//     const parsed = JSON.parse(content);

//     // Validate shape
//     if (
//       !parsed.questions ||
//       !Array.isArray(parsed.questions) ||
//       parsed.questions.length !== 10
//     ) {
//       throw new Error("Model did not return exactly 10 questions.");
//     }

//     return NextResponse.json(parsed);
//   } catch (err: any) {
//     console.error("API ERROR:", err);

//     return NextResponse.json(
//       {
//         error: err.message || "Something went wrong generating questions.",
//       },
//       { status: 500 }
//     );
//   }
// }
