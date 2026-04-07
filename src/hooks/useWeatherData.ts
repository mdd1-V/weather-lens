import { useState, useEffect, useCallback } from "react";
import type { ConsensusResult, LocationInfo, RadarData } from "@/types/weather";
import { getCurrentPosition, reverseGeocode } from "@/services/geolocation";
import { fetchAllSources } from "@/services/weatherSources";
import { analyzeConsensus } from "@/services/consensusEngine";
import { clearCache } from "@/services/cache";
import { fetchSensorCommunityAQ, sensorCommunityToAirQuality } from "@/services/sensorCommunity";

interface UseWeatherDataReturn {
  consensus: ConsensusResult | null;
  location: LocationInfo | null;
  radar: RadarData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setLocation: (loc: LocationInfo) => void;
}

export function useWeatherData(): UseWeatherDataReturn {
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [location, setLocationState] = useState<LocationInfo | null>(null);
  const [radar, setRadar] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (loc: LocationInfo) => {
    setLoading(true);
    setError(null);

    try {
      const { latitude, longitude } = loc.coordinates;

      // Fetch weather data, radar, and Sensor.Community AQ in parallel
      const [sources, radarData, sensorCommunityAQ] = await Promise.all([
        fetchAllSources(latitude, longitude),
        fetchRadarData(),
        fetchSensorCommunityAQ(latitude, longitude).catch(() => null),
      ]);

      if (sources.length === 0) {
        throw new Error("No weather data could be retrieved from any source");
      }

      const result = analyzeConsensus(sources, loc);

      // Enrich air quality with Sensor.Community data (hyperlocal citizen sensors)
      // This supplements or overrides the modeled AQ data from Open-Meteo
      if (sensorCommunityAQ) {
        const sensorAQ = sensorCommunityToAirQuality(sensorCommunityAQ);
        if (result.airQuality) {
          // Prefer citizen-sensor PM data (more localized), keep gas data from API
          result.airQuality = {
            ...result.airQuality,
            pm25: sensorAQ.pm25,
            pm10: sensorAQ.pm10,
            europeanAqi: sensorAQ.europeanAqi,
            // Keep usAqi from API source if available, otherwise calculate from sensor PM2.5
            usAqi: result.airQuality.usAqi || sensorAQ.usAqi,
          };
        } else {
          result.airQuality = sensorAQ;
        }
      }

      setConsensus(result);
      setRadar(radarData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch weather data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const initLocation = useCallback(async () => {
    try {
      // First check localStorage for a saved location
      const saved = localStorage.getItem("weatherlens_location");
      if (saved) {
        const parsedLoc = JSON.parse(saved) as LocationInfo;
        setLocationState(parsedLoc);
        await fetchWeather(parsedLoc);
        return;
      }

      // If no saved location, request browser/IP location
      const coords = await getCurrentPosition();
      const loc = await reverseGeocode(coords);
      setLocationState(loc);
      localStorage.setItem("weatherlens_location", JSON.stringify(loc));
      await fetchWeather(loc);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get location"
      );
      setLoading(false);
    }
  }, [fetchWeather]);

  useEffect(() => {
    initLocation();
  }, [initLocation]);

  const refresh = useCallback(() => {
    clearCache();
    if (location) {
      fetchWeather(location);
    }
  }, [location, fetchWeather]);

  const setLocation = useCallback(
    (loc: LocationInfo) => {
      setLocationState(loc);
      localStorage.setItem("weatherlens_location", JSON.stringify(loc));
      clearCache();
      fetchWeather(loc);
    },
    [fetchWeather]
  );

  return {
    consensus,
    location,
    radar,
    loading,
    error,
    refresh,
    setLocation,
  };
}

// ─── Radar Data Fetcher ─────────────────────────────────────────

async function fetchRadarData(): Promise<RadarData | null> {
  try {
    const res = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json"
    );
    if (!res.ok) return null;
    const data = await res.json();

    return {
      host: data.host,
      past: data.radar.past || [],
      nowcast: data.radar.nowcast || [],
    };
  } catch {
    return null;
  }
}
