import { NextResponse } from "next/server";
import { getTransactionsForMap } from "@/lib/duckdb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = {
            town: searchParams.get("town") || undefined,
            flatType: searchParams.get("flatType") || undefined,
            storeyRange: searchParams.get("storeyRange") || undefined,
            yearMin: Number(searchParams.get("yearMin")) || undefined,
            yearMax: Number(searchParams.get("yearMax")) || undefined,
            limit: searchParams.get("limit")
                ? Number(searchParams.get("limit"))
                : undefined,
        };

        const data = await getTransactionsForMap(filters);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch transaction data:", error);
        return NextResponse.json(
            { error: "Failed to fetch transaction data" },
            { status: 500 }
        );
    }
}
