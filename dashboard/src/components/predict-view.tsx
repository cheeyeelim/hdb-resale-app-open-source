"use client";

import { useEffect, useState } from "react";

interface FilterOptions {
    towns: string[];
}

// Get date of next month based on today's date
const today = new Date();
const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
const nextYear = nextMonthDate.getFullYear();
// getMonth() is 0-indexed (0 = January ... 11 = December),
// so we add 1 to get the standard 1-12 month format
const nextMonth = nextMonthDate.getMonth() + 1;

function SliderField({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {label}
                </label>
                <span className="text-sm font-semibold text-slate-800">
                    {value.toLocaleString()} {unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-dark-primary"
                style={{
                    background: `linear-gradient(to right, #DBCEA5 0%, #DBCEA5 ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%, #334155 100%)`,
                }}
            />
            <div className="flex justify-between text-xs text-slate-800">
                <span>{min.toLocaleString()} {unit}</span>
                <span>{max.toLocaleString()} {unit}</span>
            </div>
        </div>
    );
}

export function PredictView() {
    const [towns, setTowns] = useState<string[]>([]);
    const [loadingTowns, setLoadingTowns] = useState(true);

    // Form state
    const [town, setTown] = useState("");
    const [floorArea, setFloorArea] = useState(90);
    const [storey, setStorey] = useState(10);
    const [remainingLeaseYears, setRemainingLeaseYears] = useState(70);

    // Result state
    const [loading, setLoading] = useState(false);
    const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/hdbresale/api/query/filter-options")
            .then((r) => r.json())
            .then((data: FilterOptions) => {
                setTowns(data.towns);
                if (data.towns.length > 0) setTown(data.towns[0]);
            })
            .catch(console.error)
            .finally(() => setLoadingTowns(false));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setPredictedPrice(null);
        setError(null);

        const payload = {
            town,
            storey_midpoint: storey,
            floor_area_sqm: floorArea,
            remaining_lease_months: remainingLeaseYears * 12,
            year_num: nextYear,
            month_num: nextMonth,
        };

        try {
            const res = await fetch("/hdbresale/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? "Prediction failed. Please try again.");
            } else {
                setPredictedPrice(data.predictions?.[0] ?? null);
            }
        } catch {
            setError("Network error — unable to reach the prediction service.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form Panel */}
            <form
                onSubmit={handleSubmit}
                className="lg:col-span-3 bg-dark-secondary border border-slate-700/50 rounded-xl p-6 space-y-6"
            >
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Flat Details
                    </h2>
                    <p className="text-sm text-slate-900 mt-0.5">
                        Fill in the details below to estimate the price for your HDB resale flat.
                    </p>
                </div>

                {/* Town dropdown */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Town
                    </label>
                    {loadingTowns ? (
                        <div className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-light-primary focus:border-light-primary transition-all min-w-[180px]" />
                    ) : (
                        <select
                            value={town}
                            onChange={(e) => setTown(e.target.value)}
                            required
                            className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-dark-primary focus:border-dark-primary transition-all"
                        >
                            {towns.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Sliders */}
                <SliderField
                    label="Floor Area"
                    value={floorArea}
                    min={28}
                    max={280}
                    step={1}
                    unit="sqm"
                    onChange={setFloorArea}
                />
                <SliderField
                    label="Floor / Storey"
                    value={storey}
                    min={1}
                    max={50}
                    step={1}
                    unit="F"
                    onChange={setStorey}
                />
                <SliderField
                    label="Remaining Lease"
                    value={remainingLeaseYears}
                    min={1}
                    max={99}
                    step={1}
                    unit="yrs"
                    onChange={setRemainingLeaseYears}
                />

                <button
                    type="submit"
                    disabled={loading || loadingTowns}
                    className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 bg-dark-primary text-light-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-dark-primary/30"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg
                                className="w-4 h-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                                />
                            </svg>
                            Predicting…
                        </span>
                    ) : (
                        "🤖 Predict Price"
                    )}
                </button>
            </form>

            {/* Result Panel */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Prediction result */}
                {predictedPrice !== null && (
                    <div className="bg-dark-primary/40 border border-dark-primary/60 rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p className="text-lg font-bold text-slate-800 uppercase tracking-widest mb-2">
                            Estimated Resale Price
                        </p>
                        <p className="text-5xl font-extrabold text-dark-primary tracking-tight">
                            SGD{" "}
                            {Math.round(predictedPrice).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-800 mt-3">
                            Model prediction — actual prices may vary.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/20 border border-red-700/40 rounded-2xl p-5 text-center">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {predictedPrice === null && !error && (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-slate-700/50 rounded-2xl p-8 text-center">
                        <div>
                            <div className="text-4xl mb-3">🏠</div>
                            <p className="text-sm text-slate-800">
                                Fill in the form and click{" "}
                                <span className="text-slate-400 font-medium">
                                    Predict Price
                                </span>{" "}
                                to see the estimated resale value.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
