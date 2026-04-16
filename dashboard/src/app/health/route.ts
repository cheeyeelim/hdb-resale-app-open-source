import { NextResponse } from "next/server";
import { checkDuckDBReadiness } from "@/lib/duckdb";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const isDuckDBReady = await checkDuckDBReadiness();

        if (!isDuckDBReady) {
            return NextResponse.json(
                { status: "error", message: "DuckDB is not ready" },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { status: "ok", message: "Server and DuckDB are ready" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { status: "error", message: "Internal server error during health check" },
            { status: 500 }
        );
    }
}
