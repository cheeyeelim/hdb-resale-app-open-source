import { NextRequest, NextResponse } from "next/server";

const INFERENCE_API_URL = process.env.INFERENCE_API_URL;

// In-memory store for rate limiting (per container/instance)
type RateLimitInfo = {
    count: number;
    lastReset: number;
};

const rateLimitMap = new Map<string, RateLimitInfo>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max requests per window

export async function POST(req: NextRequest) {
    if (!INFERENCE_API_URL) {
        return NextResponse.json(
            { error: "Inference API URL is not configured." },
            { status: 500 }
        );
    }

    // Rate Limiting Logic
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown_ip";
    const currentTime = Date.now();
    const rateLimitInfo = rateLimitMap.get(ip) || { count: 0, lastReset: currentTime };

    // Reset the count if the window has passed
    if (currentTime - rateLimitInfo.lastReset > RATE_LIMIT_WINDOW_MS) {
        rateLimitInfo.count = 0;
        rateLimitInfo.lastReset = currentTime;
    }

    if (rateLimitInfo.count >= MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 } // 429 Too Many Requests
        );
    }

    rateLimitInfo.count++;
    rateLimitMap.set(ip, rateLimitInfo);

    // Check the origin/referer to restrict access
    const origin = req.headers.get("origin") || req.headers.get("referer");

    // You can adjust this to be an exact match (e.g. === "https://cheeyeelim.com")
    // or include www (e.g. === "https://www.cheeyeelim.com") if needed.
    // We bypass the check in development so local testing still works.
    if (
        process.env.NODE_ENV === "production" &&
        origin &&
        !origin.includes("cheeyeelim.com")
    ) {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();

        const lambdaRes = await fetch(INFERENCE_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await lambdaRes.json();

        if (!lambdaRes.ok) {
            return NextResponse.json(data, { status: lambdaRes.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Inference API proxy error:", error);
        return NextResponse.json(
            { error: "Failed to reach inference API." },
            { status: 502 }
        );
    }
}
