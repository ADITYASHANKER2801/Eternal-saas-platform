import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import axios from "axios";
import { checkSubscription } from "@/lib/subscription";
import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";
import FormData from "form-data"; // <-- Make sure this is installed

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, amount = 1 } = body;

    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!prompt) return new NextResponse("Prompt is required", { status: 400 });

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial expired. Please upgrade.", { status: 403 });
    }

    const imageResponses = await Promise.all(
      Array.from({ length: parseInt(amount) }).map(async () => {
        const form = new FormData();
        form.append("prompt", prompt);

        const response = await axios.post(
          "https://clipdrop-api.co/text-to-image/v1",
          form,
          {
            headers: {
              "x-api-key": process.env.CLIPDROP_API_KEY!,
              ...form.getHeaders(), // <-- Required to set correct Content-Type
            },
            responseType: "arraybuffer",
          }
        );
        return response;
      })
    );

    const base64Images = imageResponses.map((res) =>
      `data:image/png;base64,${Buffer.from(res.data).toString("base64")}`
    );

    if (!isPro) await incrementApiLimit();

    return NextResponse.json(base64Images);
  } catch (error) {
    console.error("[IMAGE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
