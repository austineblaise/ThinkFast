// /app/api/questions/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey:
    "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",
});

export async function POST(req: Request) {
  try {
    const { category } = await req.json();

    const prompt = `
Generate 10 multiple-choice quiz questions for the category: ${category}.
Rules:
- Respond ONLY with JSON.
- No markdown.
- No commentary.
- Format MUST be:

{
  "questions": [
    {
      "category": "${category}",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" }, // IMPORTANT
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    // ensure we have content and parse it (throw if missing)
    const content = completion.choices[0].message?.content;
    if (content == null) {
      throw new Error("No content in completion message");
    }
    // content is guaranteed to be a string now
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: err.message || "API error" },
      { status: 500 }
    );
  }
}
