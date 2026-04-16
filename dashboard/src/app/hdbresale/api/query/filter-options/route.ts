import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/duckdb";

export async function GET() {
    try {
        const options = await getFilterOptions();
        return NextResponse.json(options);
    } catch (error) {
        console.error("Failed to fetch filter options:", error);
        return NextResponse.json(
            { error: "Failed to fetch filter options" },
            { status: 500 }
        );
    }
}
