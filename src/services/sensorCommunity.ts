import type { AirQuality } from "@/types/weather";
import { getCached, setCache } from "./cache";

// ─── Sensor.Community (AirSofia.info data source) ───────────────
// This fetches real-time PM2.5 and PM10 data from the citizen science
// Sensor.Community network (formerly Luftdaten / airsofia.info's backend).
// Data is crowdsourced from SDS011, PMS5003, and similar sensors.

interface SensorReading {
  timestamp: string;
  location: {
    latitude: string;
    longitude: string;
    country: string;
    indoor: number;
  };
  sensor: {
    id: number;
    sensor_type: { name: string };
  };
  sensordatavalues: Array<{
    value: string;
    value_type: string;
  }>;
}

export interface SensorCommunityAQ {
  pm25: number;
  pm10: number;
  sensorCount: number;
  nearestSensorKm: number;
  europeanAqi: number;
  timestamp: string;
}

/**
 * Calculate European AQI from PM2.5 and PM10.
 * Based on the European Air Quality Index (EAQI) breakpoints.
 * Returns 1-5 scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
 */
function calculateEuropeanAqi(pm25: number, pm10: number): number {
  // PM2.5 breakpoints (µg/m³): 0-10, 10-20, 20-25, 25-50, 50+
  let pm25Idx: number;
  if (pm25 <= 10) pm25Idx = 1;
  else if (pm25 <= 20) pm25Idx = 2;
  else if (pm25 <= 25) pm25Idx = 3;
  else if (pm25 <= 50) pm25Idx = 4;
  else pm25Idx = 5;

  // PM10 breakpoints (µg/m³): 0-20, 20-40, 40-50, 50-100, 100+
  let pm10Idx: number;
  if (pm10 <= 20) pm10Idx = 1;
  else if (pm10 <= 40) pm10Idx = 2;
  else if (pm10 <= 50) pm10Idx = 3;
  else if (pm10 <= 100) pm10Idx = 4;
  else pm10Idx = 5;

  // AQI is the worst of the two sub-indices
  return Math.max(pm25Idx, pm10Idx);
}

/**
 * Calculate US EPA AQI from PM2.5 concentration.
 * Linear interpolation between breakpoints per EPA guidelines.
 */
function calculateUsAqi(pm25: number): number {
  const breakpoints = [
    { cLow: 0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ];

  for (const bp of breakpoints) {
    if (pm25 <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow
      );
    }
  }
  return 500; // Beyond scale
}



/**
 * Calculate the haversine distance between two lat/lon points in km.
 */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SensorMeasurement {
  pm10: number | null;
  pm25: number | null;
  distanceKm: number;
}

/**
 * Compute inverse-distance weighted average.
 * Closer sensors get exponentially more weight (1/d² with minimum floor).
 * This means if you're in Orlandovtsi, you'll see Orlandovtsi's air quality,
 * not a city-wide average.
 */
function idwAverage(measurements: { value: number; distanceKm: number }[]): number {
  if (measurements.length === 0) return 0;
  if (measurements.length === 1) return measurements[0].value;

  // Use 1/d² weighting. Minimum distance capped at 0.1km to avoid division issues.
  let weightedSum = 0;
  let totalWeight = 0;

  for (const m of measurements) {
    const d = Math.max(m.distanceKm, 0.1); // floor at 100m
    const weight = 1 / (d * d); // inverse square distance
    weightedSum += m.value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Fetch air quality data from Sensor.Community for a given location.
 * Uses the area filter API to get all sensors within a radius.
 * Aggregates readings using inverse-distance weighting so the nearest
 * sensors to your actual position have the most influence.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param radiusKm Search radius in km (default: 5)
 */
export async function fetchSensorCommunityAQ(
  lat: number,
  lon: number,
  radiusKm: number = 5
): Promise<SensorCommunityAQ | null> {
  const cacheKeyStr = `sensor-community-aq-${lat.toFixed(3)}-${lon.toFixed(3)}`;
  const cached = getCached<SensorCommunityAQ>(cacheKeyStr);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://data.sensor.community/airrohr/v1/filter/area=${lat},${lon},${radiusKm}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000), // 15s timeout - response can be large
      }
    );

    if (!res.ok) return null;
    const readings: SensorReading[] = await res.json();

    // Group readings by location, compute distance, extract PM values
    // Each sensor station (location) may have multiple sensor types
    const pm10Measurements: { value: number; distanceKm: number }[] = [];
    const pm25Measurements: { value: number; distanceKm: number }[] = [];

    for (const reading of readings) {
      // Skip indoor sensors
      if (reading.location.indoor === 1) continue;

      const sensorLat = parseFloat(reading.location.latitude);
      const sensorLon = parseFloat(reading.location.longitude);
      if (isNaN(sensorLat) || isNaN(sensorLon)) continue;

      const distanceKm = haversineKm(lat, lon, sensorLat, sensorLon);

      for (const dv of reading.sensordatavalues) {
        const val = parseFloat(dv.value);
        if (isNaN(val) || val < 0) continue;

        // P1 = PM10, P2 = PM2.5
        // Filter clearly erroneous values (sensor malfunctions)
        if (dv.value_type === "P1" && val < 1000) {
          pm10Measurements.push({ value: val, distanceKm });
        } else if (dv.value_type === "P2" && val < 500) {
          pm25Measurements.push({ value: val, distanceKm });
        }
      }
    }

    // Need at least 2 sensor readings for meaningful data
    if (pm25Measurements.length < 2 && pm10Measurements.length < 2) {
      return null;
    }

    // Use inverse-distance weighting: nearest sensors dominate the result
    const pm25 = Math.round(idwAverage(pm25Measurements) * 10) / 10;
    const pm10 = Math.round(idwAverage(pm10Measurements) * 10) / 10;

    const sensorCount = Math.max(pm25Measurements.length, pm10Measurements.length);
    const nearestDist = Math.min(
      ...pm25Measurements.map(m => m.distanceKm),
      ...pm10Measurements.map(m => m.distanceKm)
    );

    const result: SensorCommunityAQ = {
      pm25,
      pm10,
      sensorCount,
      nearestSensorKm: Math.round(nearestDist * 100) / 100,
      europeanAqi: calculateEuropeanAqi(pm25, pm10),
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes (sensor data updates every ~5 mins)
    setCache(cacheKeyStr, result, 5 * 60 * 1000);
    return result;
  } catch (err) {
    console.warn("Sensor.Community fetch failed:", err);
    return null;
  }
}

/**
 * Convert Sensor.Community data to the app's AirQuality format.
 * Only provides PM2.5 and PM10 (citizen sensors don't measure gases).
 */
export function sensorCommunityToAirQuality(data: SensorCommunityAQ): AirQuality {
  return {
    pm25: data.pm25,
    pm10: data.pm10,
    o3: 0,   // Not measured by citizen sensors
    no2: 0,  // Not measured by citizen sensors
    so2: 0,  // Not measured by citizen sensors
    co: 0,   // Not measured by citizen sensors
    usAqi: calculateUsAqi(data.pm25),
    europeanAqi: data.europeanAqi,
    source: "Sensor.Community",
  };
}
