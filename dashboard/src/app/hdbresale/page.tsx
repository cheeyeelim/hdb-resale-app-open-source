"use client";

import { useState } from "react";
import Link from "next/link";
import { Filters } from "@/components/filters";
import { ChartView } from "@/components/chart-view";
import { MapView } from "@/components/map-view";
import { PredictView } from "@/components/predict-view";
import { Github, ArrowLeft } from "lucide-react";

type ViewTab = "chart" | "map" | "predict";


export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("chart");
  const [filters, setFilters] = useState({
    town: "all",
    flatType: "all",
    storeyRange: "all",
    yearMin: 0,
    yearMax: 0,
  });

  return (
    <div className="min-h-screen bg-light-primary">
      {/* Header */}
      <header className="border-b border-slate-800 bg-dark-primary backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-light-primary bg-clip-text text-transparent">
                HDB Resale Dashboard
              </h1>
              <p className="text-sm text-slate-800 mt-0.5">
                Singapore HDB resale flat transaction insights
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/50">
              <button
                onClick={() => setActiveTab("chart")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "chart"
                  ? "bg-dark-secondary text-white shadow-lg shadow-dark-secondary/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
              >
                📊 Chart
              </button>
              <button
                onClick={() => setActiveTab("map")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "map"
                  ? "bg-dark-secondary text-white shadow-lg shadow-dark-secondary/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
              >
                🗺️ Map
              </button>
              <button
                onClick={() => setActiveTab("predict")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "predict"
                  ? "bg-dark-secondary text-white shadow-lg shadow-dark-secondary/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
              >
                🤖 Predict
              </button>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <Link
                href="/"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Go Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filters — hidden on predict tab (it has its own inputs) */}
        {activeTab !== "predict" && (
          <Filters
            town={filters.town}
            flatType={filters.flatType}
            storeyRange={filters.storeyRange}
            yearMin={filters.yearMin}
            yearMax={filters.yearMax}
            onFilterChange={setFilters}
          />
        )}

        {/* Active View */}
        {activeTab === "chart" ? (
          <ChartView
            town={filters.town}
            flatType={filters.flatType}
            storeyRange={filters.storeyRange}
            yearMin={filters.yearMin}
            yearMax={filters.yearMax}
          />
        ) : activeTab === "map" ? (
          <MapView
            town={filters.town}
            flatType={filters.flatType}
            storeyRange={filters.storeyRange}
            yearMin={filters.yearMin}
            yearMax={filters.yearMax}
          />
        ) : (
          <PredictView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-xs text-slate-600 text-center">
            Data sourced from{" "}
            <a
              href="https://data.gov.sg/dataset/resale-flat-prices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              data.gov.sg
            </a>
            , under the terms of the <a
              href="https://data.gov.sg/open-data-licence"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Singapore Open Data Licence version 1.0
            </a>
            .
          </p>
        </div>
      </footer>
      {/* Floating View Source Banner */}
      <a
        href="https://github.com/cheeyeelim/hdb-resale-app-open-source"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 px-2 py-4 bg-slate-800/90 border border-slate-700/60 border-r-0 rounded-l-xl text-slate-300 hover:text-white hover:bg-slate-700/90 hover:border-slate-600 transition-all duration-200 shadow-xl backdrop-blur-sm group"
      >
        <Github className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
        <span
          className="text-xs font-medium tracking-widest"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
        >
          View Source
        </span>
      </a>
    </div>
  );
}
