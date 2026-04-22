export interface TransactionRow {
    month: string;
    town: string;
    flat_type: string;
    block: string;
    street_name: string;
    storey_range: string;
    floor_area_sqm: number;
    remaining_lease: string;
    resale_price: number;
    latitude: number | null;
    longitude: number | null;
}

export interface MedianPrice {
    year: number;
    month: number;
    date: number;
    median_price: number;
    count: number;
}

export interface FilterOptions {
    towns: string[];
    flat_types: string[];
    storey_ranges: string[];
    years: {
        min: number;
        max: number;
    };
}

export interface FiltersProps {
    town: string;
    flatType: string;
    storeyRange: string;
    yearMin: number;
    yearMax: number;
    onFilterChange: (filters: { town: string; flatType: string; storeyRange: string; yearMin: number; yearMax: number }) => void;
}

export interface ChartViewProps {
    town: string;
    flatType: string;
    storeyRange: string;
    yearMin: number;
    yearMax: number;
}

export interface MapViewProps {
    town: string;
    flatType: string;
    storeyRange: string;
    yearMin: number;
    yearMax: number;
}