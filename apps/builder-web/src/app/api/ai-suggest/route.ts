import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BUCKET_NAMES = ["auth", "crud", "dashboard", "cart", "file-upload", "notifications"];

const SYSTEM_PROMPT = `You are an expert full-stack app architect. The user describes what they want to build, and you select the right feature buckets and configure them.

Available buckets:
- auth: Login, signup, JWT sessions, user management
- crud: Dynamic CRUD entity (products, customers, orders, posts — anything)
- dashboard: Metrics overview, stats, activity feed
- cart: Shopping cart, add to cart, checkout flow (needs crud with entityType=commerce)
- file-upload: File/image upload and storage
- notifications: In-app and email notifications

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "buckets": [
    {
      "name": "auth",
      "config": {}
    },
    {
      "name": "crud",
      "config": {
        "entityName": "Product",
        "entityType": "commerce",
        "fields": [
          { "name": "title", "type": "string", "required": true },
          { "name": "price", "type": "number", "required": true },
          { "name": "description", "type": "string", "required": false },
          { "name": "image", "type": "string", "required": false },
          { "name": "stock", "type": "number", "required": false }
        ]
      }
    }
  ],
  "explanation": "Brief explanation of what was selected and why",
  "appName": "suggested-app-name"
}

Rules:
- Always include auth if the app needs user accounts
- If cart is selected, also select crud with entityType=commerce and relevant fields
- Configure crud.entityName based on what the user is building (Product, Course, Recipe, etc.)
- appName should be kebab-case, short and descriptive
- Only suggest buckets that make sense for the use case
- Fill in realistic field names for crud based on the domain
- Respond with ONLY the JSON object, no markdown, no extra text`;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Build me: ${prompt}` },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content ?? "";

    const suggestion = JSON.parse(text) as {
      buckets: Array<{ name: string; config: Record<string, unknown> }>;
      explanation: string;
      appName: string;
    };

    // Validate bucket names
    suggestion.buckets = suggestion.buckets.filter((b) =>
      BUCKET_NAMES.includes(b.name)
    );

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
