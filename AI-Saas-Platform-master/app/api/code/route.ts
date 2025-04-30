import { NextResponse } from "next/server";
import "dotenv/config";

import { checkApiLimit, incrementApiLimit, getApiLimitCount } from "@/lib/api-limit";
import { MAX_FREE_COUNTS } from "@/constants"; // ✅ Import MAX_FREE_COUNTS

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
const MISTRAL_API_BASE = process.env.MISTRAL_API_BASE || "https://api.mistral.ai/v1";

if (!MISTRAL_API_KEY) {
    console.error("❌ MISTRAL_API_KEY is missing or empty");
    throw new Error("MISTRAL_API_KEY is required");
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "Messages are required" }, { status: 400 });
        }

        // 1️⃣ Check if the user is within their free API limit
        const isWithinLimit = await checkApiLimit();
        if (!isWithinLimit) {
            return NextResponse.json({ error: "No free generations left" }, { status: 403 });
        }

        // 2️⃣ Call the Mistral API
        const response = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MISTRAL_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "mistral-medium",
                messages: [{ role: "user", content: messages[0].content }],
                max_tokens: 1000,
            }),
        });

        const responseBody = await response.json();

        if (!response.ok) {
            console.error("❌ Mistral API Error:", response.status, responseBody);
            return NextResponse.json({ error: `Mistral API Error: ${responseBody}` }, { status: response.status });
        }

        const aiResponse = responseBody.choices?.[0]?.message?.content || "No response from Mistral AI";

        // 3️⃣ Increment the API usage count after a successful request
        await incrementApiLimit();

        // 4️⃣ Fetch the updated API usage count
        const freeGenerationsRemaining = await getApiLimitCount();

        // 5️⃣ Return response with updated API count
        return NextResponse.json({
            message: aiResponse,
            free_generations_remaining: Math.max(0, MAX_FREE_COUNTS - freeGenerationsRemaining), // ✅ Now works correctly
        });

    } catch (error) {
        console.error("❌ Error processing request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
