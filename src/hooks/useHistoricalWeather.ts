import { useState, useEffect } from "react";
import type { LocationInfo } from "@/types/weather";

export interface HistoricalYearData {
  year: number;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

export interface HistoricalResult {
  oneYear: HistoricalYearData | null;
  fiveYears: HistoricalYearData | null;
  tenYears: HistoricalYearData | null;
}

export function useHistoricalWeather(location: LocationInfo | null) {
  const [historicalData, setHistoricalData] = useState<HistoricalResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchHistory() {
      try {
        const { latitude, longitude } = location!.coordinates;
        
        // Calculate dates for 1, 5, and 10 years ago
        const today = new Date();
        const getIsoDate = (yearsAgo: number) => {
          const d = new Date(today);
          d.setFullYear(d.getFullYear() - yearsAgo);
          // Format as YYYY-MM-DD
          return d.toISOString().split("T")[0];
        };

        const date1 = getIsoDate(1);
        const date5 = getIsoDate(5);
        const date10 = getIsoDate(10);

        // Fetch daily data from the archive API
        // We fetch the max temp, min temp, and total precipitation for those exact days
        const fetchYear = async (dateStr: string, yearOffset: number): Promise<HistoricalYearData | null> => {
          try {
            const res = await fetch(
              `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
            );
            if (!res.ok) return null;
            const data = await res.json();
            
            if (!data.daily || data.daily.time.length === 0) return null;
            
            return {
              year: today.getFullYear() - yearOffset,
              tempMax: data.daily.temperature_2m_max[0],
              tempMin: data.daily.temperature_2m_min[0],
              precipitation: data.daily.precipitation_sum[0],
            };
          } catch {
            return null;
          }
        };

        const [one, five, ten] = await Promise.all([
          fetchYear(date1, 1),
          fetchYear(date5, 5),
          fetchYear(date10, 10),
        ]);

        if (isMounted) {
          setHistoricalData({ oneYear: one, fiveYears: five, tenYears: ten });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load history");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [location?.coordinates.latitude, location?.coordinates.longitude]); 
  // Dependency specifically on coordinates to prevent over-fetching if only name updates

  return { historicalData, loading, error };
}
