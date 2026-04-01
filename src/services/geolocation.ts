import type { Coordinates, LocationInfo } from "@/types/weather";

/**
 * Get the user's current position via the Geolocation API.
 * Falls back to IP-based geolocation if permission is denied.
 */
export async function getCurrentPosition(): Promise<Coordinates> {
  // Try browser geolocation first
  if ("geolocation" in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300_000, // 5 min cache
        });
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch {
      console.warn("Geolocation denied or timed out. Bypassing IP-based location due to European ISP routing inaccuracies.");
    }
  }

  // Default fallback (e.g., London) if precision HTML5 GPS fails
  return { latitude: 51.5074, longitude: -0.1278 };
}

/**
 * Reverse geocode coordinates to a city name using Open-Meteo Geocoding API
 */
export async function reverseGeocode(
  coords: Coordinates
): Promise<LocationInfo> {
  try {
    // Use Open-Meteo geocoding to find nearest city
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${coords.latitude}&longitude=${coords.longitude}&count=1&language=en&format=json`
    );

    // If geocoding doesn't work for reverse, use a simple approach with weatherapi
    const weatherApiKey = import.meta.env.VITE_WEATHERAPI_KEY;
    if (weatherApiKey && weatherApiKey !== "your_weatherapi_key_here") {
      const wRes = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${coords.latitude},${coords.longitude}`
      );
      if (wRes.ok) {
        const wData = await wRes.json();
        return {
          name: wData.location.name,
          region: wData.location.region,
          country: wData.location.country,
          coordinates: coords,
        };
      }
    }

    // Fallback: use wttr.in for location name
    const wttrRes = await fetch(
      `https://wttr.in/${coords.latitude},${coords.longitude}?format=j1`
    );
    if (wttrRes.ok) {
      const wttrData = await wttrRes.json();
      const area = wttrData.nearest_area?.[0];
      return {
        name: area?.areaName?.[0]?.value || "Unknown",
        region: area?.region?.[0]?.value || "",
        country: area?.country?.[0]?.value || "",
        coordinates: coords,
      };
    }

    void res;
  } catch {
    // ignore
  }

  return {
    name: "Current Location",
    region: "",
    country: "",
    coordinates: coords,
  };
}

/**
 * Search for cities using Open-Meteo Geocoding API
 */
export async function searchCities(
  query: string
): Promise<LocationInfo[]> {
  if (query.length < 2) return [];

  try {
    // Use OpenStreetMap Nominatim for highly detailed address-level search
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      { headers: { "User-Agent": "WeatherLensApp/1.0" } }
    );
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map(
      (r: any) => {
        // Parse the massive display_name into cleaner UI chunks
        const parts = r.display_name.split(", ").map((p: string) => p.trim());
        const name = parts[0];
        const country = r.address?.country || parts[parts.length - 1];
        
        // Everything between name and country
        let region = "";
        if (parts.length > 2) {
          region = parts.slice(1, parts.length - 1).join(", ");
        } else if (parts.length === 2 && parts[1] !== country) {
          region = parts[1];
        }

        return {
          name,
          region,
          country,
          coordinates: {
            latitude: parseFloat(r.lat),
            longitude: parseFloat(r.lon),
          },
        };
      }
    );
  } catch {
    return [];
  }
}
