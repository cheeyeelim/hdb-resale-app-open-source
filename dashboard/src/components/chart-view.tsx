"use client";

import { useEffect, useState } from "react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";
import { MedianPrice, ChartViewProps } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils";


export function ChartView({ town, flatType, storeyRange, yearMin, yearMax }: ChartViewProps) {
    const [data, setData] = useState<MedianPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (town && town !== "all") params.set("town", town);
        if (flatType && flatType !== "all") params.set("flatType", flatType);
        if (storeyRange && storeyRange !== "all") params.set("storeyRange", storeyRange);
        if (yearMin) params.set("yearMin", String(yearMin));
        if (yearMax) params.set("yearMax", String(yearMax));

        fetch(`/hdbresale/api/query/median-price?${params}`)
            .then((res) => res.json())
            .then(setData)
            .catch((e) => {
                console.error(e);
                setError("Failed to load chart data. Please check your S3 configuration.");
            })
            .finally(() => setLoading(false));
    }, [town, flatType, storeyRange, yearMin, yearMax]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96 bg-dark-secondary rounded-xl border border-slate-700/50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-800 text-sm">Loading chart data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96 bg-dark-secondary rounded-xl border border-red-800/50">
                <p className="text-red-800 text-sm">{error}</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-dark-secondary rounded-xl border border-slate-700/50">
                <p className="text-slate-800 text-sm">No data available for the selected filters.</p>
            </div>
        );
    }

    const totalTransactions = data.reduce((sum, d) => sum + d.count, 0);
    const latestPrice = data[data.length - 1]?.median_price || 0;
    const firstPrice = data[0]?.median_price || 0;
    const pctChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-light-secondary rounded-xl p-4 border border-slate-500/20">
                    <p className="text-xs text-slate-800 uppercase tracking-wider font-medium">Latest Median</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{formatPrice(latestPrice)}</p>
                </div>
                <div className="bg-light-secondary rounded-xl p-4 border border-slate-500/20">
                    <p className="text-xs text-slate-800 uppercase tracking-wider font-medium">Percentage Change</p>
                    <p className={`text-2xl font-bold mt-1 ${pctChange >= 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-light-secondary rounded-xl p-4 border border-slate-500/20">
                    <p className="text-xs text-slate-800 uppercase tracking-wider font-medium">Number of Transactions</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{totalTransactions.toLocaleString()}</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-dark-secondary rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Median Resale Price</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#003910ff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#003910ff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#545454ff"
                            syncWithTicks={true}
                        />
                        <XAxis
                            dataKey="date"
                            stroke="#000000"
                            fontSize={12}
                            interval={11}
                            tickLine={true}
                            tickFormatter={formatDate}
                        />
                        <YAxis
                            stroke="#000000"
                            fontSize={12}
                            tickLine={true}
                            tickFormatter={formatPrice}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #475569",
                                borderRadius: "12px",
                                color: "#e2e8f0",
                                fontSize: "13px",
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value: number) => [formatPrice(value), "Median Price"]}
                            labelFormatter={(label: string) => `Date : ${formatDate(label)}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="median_price"
                            stroke="#003910ff"
                            strokeWidth={2.5}
                            fill="url(#priceGradient)"
                            dot={{ fill: "#003910ff", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: "#007321ff" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
