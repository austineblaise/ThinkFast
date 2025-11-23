// /app/api/questions/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "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", // <-- SAFER
});

export async function POST(req: Request) {
  try {
    const { category } = await req.json();

    if (!category) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 }
      );
    }

    // Sanitize category (prevent chaos)
    const safeCategory = String(category).trim().slice(0, 40);

    const prompt = `
You are an exam question generator.

TASK:
Create exactly 10 valid multiple-choice quiz questions for the category "${safeCategory}".

STRICT RULES:
- The response MUST be valid JSON only.
- Do NOT include markdown.
- Do NOT include explanations.
- Every question MUST follow this schema exactly:

{
  "category": "${safeCategory}",
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "answer": "A"
}

RULES:
- Do NOT repeat any question.
- Options must be short and clear.
- Answer must be one of the options.
- If the category is unknown or unclear, assume standard general knowledge.

FINAL OUTPUT FORMAT:
{
  "questions": [ ...10 questions... ]
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0, // <-- For accuracy & consistency
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict JSON generator. You MUST return only JSON and must follow the required structure.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0].message?.content;

    if (!content) {
      throw new Error("Empty response from ChatGPT.");
    }

    const parsed = JSON.parse(content);

    // Validate shape
    if (
      !parsed.questions ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length !== 10
    ) {
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
//   apiKey:
//     "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",
// });

// export async function POST(req: Request) {
//   try {
//     const { category } = await req.json();

//     const prompt = `
// Generate 10 multiple-choice quiz questions for the category: ${category}.
// Rules:
// - Respond ONLY with JSON.
// - No markdown.
// - No commentary.
// - Format MUST be:

// {
//   "questions": [
//     {
//       "category": "${category}",
//       "question": "string",
//       "options": ["A", "B", "C", "D"],
//       "answer": "A"
//     }
//   ]
// }
// `;

//     const completion = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       response_format: { type: "json_object" }, // IMPORTANT
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.4,
//     });

//     // ensure we have content and parse it (throw if missing)
//     const content = completion.choices[0].message?.content;
//     if (content == null) {
//       throw new Error("No content in completion message");
//     }
//     // content is guaranteed to be a string now
//     const parsed = JSON.parse(content);

//     return NextResponse.json(parsed);
//   } catch (err: any) {
//     console.error("API ERROR:", err);
//     return NextResponse.json(
//       { error: err.message || "API error" },
//       { status: 500 }
//     );
//   }
// }
