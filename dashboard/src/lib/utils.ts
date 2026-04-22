import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatPrice(value: number): string {
    return `$${value.toLocaleString()}`;
}

export function formatDate(dateStr: number | string): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Get the color of the marker based on the price for MapView.
 * @param price The price of the transaction.
 * @returns The color of the marker.
 */
export function getPriceColor(price: number): string {
    if (price < 500_000) return "#5ec962";
    if (price < 800_000) return "#21918c";
    if (price < 1_000_000) return "#3b528b";
    return "#440154";
}