import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
const MISTRAL_API_BASE = process.env.MISTRAL_API_BASE || "https://api.mistral.ai/v1";

if (!MISTRAL_API_KEY) {
    console.error("❌ MISTRAL_API_KEY is missing or empty");
    throw new Error("MISTRAL_API_KEY is required");
}

// Define the expected structure for a chat message
interface ChatMessage {
    role: string;
    content: string;
}

// Define the expected request body structure
interface ChatRequestBody {
    messages: ChatMessage[];
}

export async function POST(req: NextRequest) {
    try {
        const body: ChatRequestBody = await req.json();
        console.log("✅ Received request body:", body);

        const userMessage = body.messages.find((msg: ChatMessage) => msg.role === "user");
        if (!userMessage || !userMessage.content) {
            return NextResponse.json({ error: "User message is missing or invalid" }, { status: 400 });
        }

        const aiResponse = await fetchMistralResponse(userMessage.content);
        console.log("✅ Final Response Sent:", aiResponse);

        return NextResponse.json({ response: aiResponse });
    } catch (error) {
        console.error("❌ Error processing request:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

async function fetchMistralResponse(prompt: string) {
    try {
        console.log("🚀 Sending prompt to Mistral:", prompt);

        const response = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MISTRAL_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "mistral-medium",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1000,
            }),
        });

        const responseBody = await response.text(); // Log full response as text
        console.log("📩 Mistral Raw Response:", responseBody);

        if (!response.ok) {
            console.error("❌ Mistral API Error:", response.status, responseBody);
            return `Error from Mistral API: ${responseBody}`;
        }

        const data = JSON.parse(responseBody);
        return data.choices?.[0]?.message?.content || "No response from Mistral AI";
    } catch (error) {
        console.error("❌ Error fetching Mistral response:", error);
        return "Error communicating with Mistral AI";
    }
}
