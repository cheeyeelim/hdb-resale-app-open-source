"use client";

import { useEffect, useState } from "react";
import { FilterOptions, FiltersProps } from "@/lib/types";

export function Filters({ town, flatType, storeyRange, yearMin, yearMax, onFilterChange }: FiltersProps) {
    const [options, setOptions] = useState<FilterOptions | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/hdbresale/api/query/filter-options")
            .then((res) => res.json())
            .then(setOptions)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-4 p-4 bg-dark-secondary rounded-xl border border-slate-700/50 backdrop-blur-sm animate-pulse">
                <div className="h-10 w-40 bg-slate-700 rounded-lg" />
                <div className="h-10 w-40 bg-slate-700 rounded-lg" />
                <div className="h-10 w-40 bg-slate-700 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-dark-secondary rounded-xl border border-slate-700/50 backdrop-blur-sm">
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-900 uppercase tracking-wider">Min Year</label>
                <select
                    value={yearMin}
                    onChange={(e) => onFilterChange({ town, flatType, storeyRange, yearMin: Number(e.target.value), yearMax })}
                    className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-light-primary focus:border-light-primary transition-all min-w-[180px]"
                >
                    {options?.years && Array.from(
                        { length: options.years.max - options.years.min + 1 },
                        (_, i) => options.years.min + i
                    ).map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-900 uppercase tracking-wider">Max Year</label>
                <select
                    value={yearMax}
                    onChange={(e) => onFilterChange({ town, flatType, storeyRange, yearMin, yearMax: Number(e.target.value) })}
                    className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-light-primary focus:border-light-primary transition-all min-w-[180px]"
                >
                    {options?.years && Array.from(
                        { length: options.years.max - options.years.min + 1 },
                        (_, i) => options.years.max - i
                    ).map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-900 uppercase tracking-wider">Town</label>
                <select
                    value={town}
                    onChange={(e) => onFilterChange({ town: e.target.value, flatType, storeyRange, yearMin, yearMax })}
                    className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-light-primary focus:border-light-primary transition-all min-w-[180px]"
                >
                    <option value="all">All Towns</option>
                    {options?.towns.map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-900 uppercase tracking-wider">Flat Type</label>
                <select
                    value={flatType}
                    onChange={(e) => onFilterChange({ town, flatType: e.target.value, storeyRange, yearMin, yearMax })}
                    className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-light-primary focus:border-light-primary transition-all min-w-[160px]"
                >
                    <option value="all">All Types</option>
                    {options?.flat_types.map((ft) => (
                        <option key={ft} value={ft}>{ft}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-900 uppercase tracking-wider">Floor</label>
                <select
                    value={storeyRange}
                    onChange={(e) => onFilterChange({ town, flatType, storeyRange: e.target.value, yearMin, yearMax })}
                    className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-light-primary focus:border-light-primary transition-all min-w-[160px]"
                >
                    <option value="all">All Floors</option>
                    {options?.storey_ranges.map((sr) => (
                        <option key={sr} value={sr}>{sr}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
