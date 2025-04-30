import axios from "axios";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired. Please upgrade to pro.", { status: 403 });
    }

    // Call Pexels API to search for videos based on the prompt
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    const pexelsUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&per_page=1`;

    const response = await axios.get(pexelsUrl, {
      headers: {
        Authorization: pexelsApiKey!,
      },
    });

    const videoUrl = response.data.videos[0]?.video_files[0]?.link;

    if (!videoUrl) {
      return new NextResponse("No video found for the given prompt.", { status: 404 });
    }

    if (!isPro) {
      await incrementApiLimit();
    }

    return NextResponse.json([videoUrl]);
  } catch (error) {
    console.log('[VIDEO_ERROR]', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
