import { NextResponse } from "next/server";
import { getMedianPrice } from "@/lib/duckdb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            town: searchParams.get("town") || undefined,
            flatType: searchParams.get("flatType") || undefined,
            storeyRange: searchParams.get("storeyRange") || undefined,
            yearMin: Number(searchParams.get("yearMin")) || undefined,
            yearMax: Number(searchParams.get("yearMax")) || undefined,
        };

        const data = await getMedianPrice(filters);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch median price data:", error);
        return NextResponse.json(
            { error: "Failed to fetch median price data" },
            { status: 500 }
        );
    }
}
