import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import { TransactionRow, MedianPrice, FilterOptions } from "@/lib/types";

let instance: DuckDBInstance | null = null;
let connection: DuckDBConnection | null = null;
let initPromise: Promise<DuckDBConnection> | null = null;
let credentialRefreshTimer: ReturnType<typeof setInterval> | null = null;

const PARQUET_URL = "s3://hdb-resale-data-20260217/processed/hdb_resale_processed.parquet";
const S3_REGION = "ap-southeast-1";

// How often to refresh the CREDENTIAL_CHAIN secret (ECS task role creds rotate every ~6h,
// but we refresh more frequently to stay well within the expiry window).
const CREDENTIAL_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Refresh the CREDENTIAL_CHAIN secret on an existing connection.
// Called on a timer so credentials are never stale after a long-running container.
async function refreshCredentials(conn: DuckDBConnection): Promise<void> {
    try {
        await conn.run(`
            CREATE OR REPLACE SECRET s3_secret (
                TYPE S3,
                PROVIDER CREDENTIAL_CHAIN,
                REGION '${S3_REGION}'
            );
        `);
        console.log("[duckdb] S3 credentials refreshed via CREDENTIAL_CHAIN");
    } catch (err) {
        console.error("[duckdb] Failed to refresh S3 credentials:", err);
    }
}

// Tear down the existing DuckDB instance so the next call to getConnection()
// will create a fresh one with new credentials.
async function resetDuckDB(): Promise<void> {
    if (credentialRefreshTimer) {
        clearInterval(credentialRefreshTimer);
        credentialRefreshTimer = null;
    }
    try { connection?.closeSync(); } catch { /* ignore */ }
    try { instance?.closeSync(); } catch { /* ignore */ }
    instance = null;
    connection = null;
    initPromise = null;
    console.log("[duckdb] Instance reset — will reinitialize on next request");
}

async function createConnection(): Promise<DuckDBConnection> {
    instance = await DuckDBInstance.create(":memory:");
    const conn = await instance.connect();

    // Extensions are pre-installed in the Docker image for offline ECS use.
    // LOAD (not INSTALL) is sufficient at runtime.
    await conn.run("LOAD aws; LOAD httpfs;");

    await conn.run(`SET s3_region = '${S3_REGION}';`);
    // Do NOT set s3_url_style = 'path' — path-style S3 URLs were deprecated by AWS
    // for buckets created after Sept 2020 and return HTTP 400.
    // DuckDB defaults to virtual-hosted style which works correctly.

    // Use the credential_chain secret provider to use the AWS SDK credential chain.
    // On ECS, this reads credentials from the task role via the metadata endpoint
    // (AWS_CONTAINER_CREDENTIALS_RELATIVE_URI), which auto-rotates.
    await conn.run(`
        CREATE OR REPLACE SECRET s3_secret (
            TYPE S3,
            PROVIDER CREDENTIAL_CHAIN,
            REGION '${S3_REGION}'
        );
    `);

    // Schedule periodic credential refresh so long-running containers always
    // have fresh credentials — important for spot instances that may run for hours.
    if (credentialRefreshTimer) clearInterval(credentialRefreshTimer);
    credentialRefreshTimer = setInterval(
        () => refreshCredentials(conn),
        CREDENTIAL_REFRESH_INTERVAL_MS
    );

    console.log("[duckdb] Initialized with fresh CREDENTIAL_CHAIN credentials");
    return conn;
}

// Retry helper: retries fn up to maxAttempts times with exponential backoff.
// Used to handle the race where the ECS metadata endpoint isn't ready immediately
// after a spot instance restart.
async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 5,
    baseDelayMs: number = 2000
): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.warn(
                    `[duckdb] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`,
                    err
                );
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }
    throw lastErr;
}

async function getConnection(): Promise<DuckDBConnection> {
    if (connection) return connection;
    if (initPromise) return initPromise;

    initPromise = withRetry(createConnection)
        .then((conn) => {
            connection = conn;
            return conn;
        })
        .catch((err) => {
            // Clear the promise so the next caller will try again
            initPromise = null;
            throw err;
        });

    return initPromise;
}

// Detect S3 permission errors so we can reinitialize with fresh credentials.
function isCredentialError(err: unknown): boolean {
    const msg = String(err);
    return (
        msg.includes("AccessDenied") ||
        msg.includes("403") ||
        msg.includes("InvalidAccessKeyId") ||
        msg.includes("ExpiredToken") ||
        msg.includes("AuthorizationHeaderMalformed")
    );
}

// Wraps a DuckDB query with automatic credential-error recovery:
// if the query fails with an S3 auth error, reset and retry once with fresh creds.
async function runWithCredentialRecovery<T>(
    queryFn: (conn: DuckDBConnection) => Promise<T>
): Promise<T> {
    const conn = await getConnection();
    try {
        return await queryFn(conn);
    } catch (err) {
        if (isCredentialError(err)) {
            console.warn(
                "[duckdb] S3 credential error detected — resetting and retrying with fresh credentials",
                err
            );
            await resetDuckDB();
            const freshConn = await getConnection();
            return await queryFn(freshConn);
        }
        throw err;
    }
}

export async function checkDuckDBReadiness(): Promise<boolean> {
    try {
        const conn = await getConnection();
        await conn.runAndReadAll("SELECT 1;");
        return true;
    } catch (error) {
        console.error("[duckdb] Readiness check failed:", error);
        return false;
    }
}

// --- Query helpers ---

function buildWhereClause(filters: {
    town?: string;
    flatType?: string;
    storeyRange?: string;
    yearMin?: number;
    yearMax?: number;
}): string {
    const conditions: string[] = [];
    if (filters.town && filters.town !== "all") {
        conditions.push(`town = '${filters.town}'`);
    }
    if (filters.flatType && filters.flatType !== "all") {
        conditions.push(`flat_type = '${filters.flatType}'`);
    }
    if (filters.storeyRange && filters.storeyRange !== "all") {
        conditions.push(`storey_range = '${filters.storeyRange}'`);
    }
    if (filters.yearMin) {
        conditions.push(`year_num >= ${Number(filters.yearMin)}`);
    }
    if (filters.yearMax) {
        conditions.push(`year_num <= ${Number(filters.yearMax)}`);
    }
    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

export async function getFilterOptions(): Promise<FilterOptions> {
    return runWithCredentialRecovery(async (conn) => {
        const [townsReader, flatTypesReader, storeyReader, yearReader] = await Promise.all([
            conn.runAndReadAll(
                `SELECT DISTINCT town FROM '${PARQUET_URL}' ORDER BY town`
            ),
            conn.runAndReadAll(
                `SELECT DISTINCT flat_type FROM '${PARQUET_URL}' ORDER BY flat_type`
            ),
            conn.runAndReadAll(
                `SELECT DISTINCT storey_range FROM '${PARQUET_URL}' ORDER BY storey_range`
            ),
            conn.runAndReadAll(
                `SELECT MIN(year_num) as min_year, MAX(year_num) as max_year FROM '${PARQUET_URL}'`
            ),
        ]);

        const towns = townsReader.getRowObjects().map(
            (r: Record<string, unknown>) => r.town as string
        );
        const flat_types = flatTypesReader.getRowObjects().map(
            (r: Record<string, unknown>) => r.flat_type as string
        );
        const storey_ranges = storeyReader.getRowObjects().map(
            (r: Record<string, unknown>) => r.storey_range as string
        );
        const yearRow = yearReader.getRowObjects()[0] as Record<string, unknown>;
        const years = {
            min: Number(yearRow.min_year),
            max: Number(yearRow.max_year)
        };

        return { towns, flat_types, storey_ranges, years };
    });
}

export async function getMedianPrice(filters: {
    town?: string;
    flatType?: string;
    storeyRange?: string;
    yearMin?: number;
    yearMax?: number;
}): Promise<MedianPrice[]> {
    const where = buildWhereClause(filters);
    return runWithCredentialRecovery(async (conn) => {
        const reader = await conn.runAndReadAll(`
            SELECT
                year_num, month_num,
                MEDIAN(resale_price) AS median_price,
                COUNT(*) AS count
            FROM '${PARQUET_URL}'
            ${where}
            GROUP BY year_num, month_num
            ORDER BY year_num, month_num
        `);

        return reader.getRowObjects().map((r: Record<string, unknown>) => ({
            year: Number(r.year_num),
            month: Number(r.month_num),
            date: Date.UTC(Number(r.year_num), Number(r.month_num) - 1, 1),
            median_price: Math.round(Number(r.median_price)),
            count: Number(r.count),
        }));
    });
}

export async function getTransactionsForMap(filters: {
    town?: string;
    flatType?: string;
    storeyRange?: string;
    yearMin?: number;
    yearMax?: number;
    limit?: number;
}): Promise<TransactionRow[]> {
    const where = buildWhereClause(filters);
    const limit = filters.limit || 5000;

    return runWithCredentialRecovery(async (conn) => {
        const reader = await conn.runAndReadAll(`
            SELECT
                month, town, flat_type, block, street_name,
                storey_range, floor_area_sqm, remaining_lease, resale_price,
                latitude, longitude
            FROM '${PARQUET_URL}'
            ${where}
            ${where ? "AND" : "WHERE"} latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY month DESC
            LIMIT ${limit}
        `);

        return reader.getRowObjects().map((r: Record<string, unknown>) => ({
            month: r.month as string,
            town: r.town as string,
            flat_type: r.flat_type as string,
            block: r.block as string,
            street_name: r.street_name as string,
            storey_range: r.storey_range as string,
            floor_area_sqm: Number(r.floor_area_sqm),
            remaining_lease: r.remaining_lease as string,
            resale_price: Number(r.resale_price),
            latitude: r.latitude != null ? Number(r.latitude) : null,
            longitude: r.longitude != null ? Number(r.longitude) : null,
        })) as TransactionRow[];
    });
}

// Warm up DuckDB after a short delay to avoid racing the ECS credential metadata
// endpoint, which may not be ready at the exact instant the container starts.
// Using a 5s delay gives the ECS agent time to populate the credential endpoint.
setTimeout(() => {
    getConnection().catch((err) => {
        console.error("[duckdb] Failed to pre-initialize DuckDB (will retry on first request):", err);
    });
}, 5000);
