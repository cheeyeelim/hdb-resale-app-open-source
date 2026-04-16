import { NextRequest, NextResponse } from "next/server";

const INFERENCE_API_URL = process.env.INFERENCE_API_URL;

export async function POST(req: NextRequest) {
    if (!INFERENCE_API_URL) {
        return NextResponse.json(
            { error: "Inference API URL is not configured." },
            { status: 500 }
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
