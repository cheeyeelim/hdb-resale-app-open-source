"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TransactionRow, MapViewProps } from "@/lib/types";
import { formatPrice, getPriceColor } from "@/lib/utils";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const CircleMarker = dynamic(
    () => import("react-leaflet").then((mod) => mod.CircleMarker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);

export function MapView({ town, flatType, storeyRange, yearMin, yearMax }: MapViewProps) {
    const [data, setData] = useState<TransactionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (town && town !== "all") params.set("town", town);
        if (flatType && flatType !== "all") params.set("flatType", flatType);
        if (storeyRange && storeyRange !== "all") params.set("storeyRange", storeyRange);
        if (yearMin) params.set("yearMin", String(yearMin));
        if (yearMax) params.set("yearMax", String(yearMax));
        params.set("limit", "5000");

        fetch(`/hdbresale/api/query/transactions?${params}`)
            .then((res) => res.json())
            .then(setData)
            .catch((e) => {
                console.error(e);
                setError("Failed to load map data. Please check your S3 configuration.");
            })
            .finally(() => setLoading(false));
    }, [town, flatType, storeyRange, yearMin, yearMax]);

    if (!isMounted) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-dark-secondary rounded-xl border border-slate-700/50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-800 text-sm">Loading map data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-dark-secondary rounded-xl border border-red-800/50">
                <p className="text-red-800 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-800">
                    Showing <span className="text-slate-600 font-medium">{data.length.toLocaleString()}</span> transactions
                </p>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-slate-800">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#5ec962]" /> &lt;$500K
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#21918c]" /> $500-800K
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#3b528b]" /> $800-1,00K
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#440154]" /> $1,000K+
                    </span>
                </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-700/50">
                <MapContainer
                    center={[1.3521, 103.8198]}
                    zoom={12}
                    style={{ height: "600px", width: "100%" }}
                    className="z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    {data.map((tx, i) =>
                        tx.latitude && tx.longitude ? (
                            <CircleMarker
                                key={`${tx.block}-${tx.street_name}-${tx.month}-${i}`}
                                center={[tx.latitude, tx.longitude]}
                                radius={4}
                                fillColor={getPriceColor(tx.resale_price)}
                                fillOpacity={0.7}
                                stroke={false}
                            >
                                <Popup>
                                    <div className="text-sm space-y-1 min-w-[200px]">
                                        <p className="font-semibold text-base">
                                            {tx.block} {tx.street_name}, {tx.town}
                                        </p>
                                        <hr className="my-1" />
                                        <p>
                                            <strong>Registration Date:</strong> {tx.month}
                                        </p>
                                        <p>
                                            <strong>Price:</strong> {formatPrice(tx.resale_price)}
                                        </p>
                                        <p>
                                            <strong>Flat Type:</strong> {tx.flat_type}
                                        </p>
                                        <p>
                                            <strong>Storey Range:</strong> {tx.storey_range}
                                        </p>
                                        <p>
                                            <strong>Floor Area:</strong> {tx.floor_area_sqm} sqm
                                        </p>
                                        <p>
                                            <strong>Remaining Lease:</strong> {tx.remaining_lease}
                                        </p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ) : null
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
