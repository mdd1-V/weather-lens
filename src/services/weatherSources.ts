import type {
  WeatherSourceData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  WeatherCondition,
  AirQuality,
  Astronomy,
} from "@/types/weather";
import { getCached, setCache, cacheKey } from "./cache";

// ─── Weather Condition Mapping Helpers ──────────────────────────

function mapWMOCode(code: number, isDay: boolean): { condition: WeatherCondition; text: string } {
  const map: Record<number, { condition: WeatherCondition; text: string }> = {
    0: { condition: "clear", text: isDay ? "Clear Sky" : "Clear Night" },
    1: { condition: "clear", text: "Mainly Clear" },
    2: { condition: "partly-cloudy", text: "Partly Cloudy" },
    3: { condition: "overcast", text: "Overcast" },
    45: { condition: "fog", text: "Fog" },
    48: { condition: "fog", text: "Depositing Rime Fog" },
    51: { condition: "drizzle", text: "Light Drizzle" },
    53: { condition: "drizzle", text: "Moderate Drizzle" },
    55: { condition: "drizzle", text: "Dense Drizzle" },
    61: { condition: "rain", text: "Slight Rain" },
    63: { condition: "rain", text: "Moderate Rain" },
    65: { condition: "heavy-rain", text: "Heavy Rain" },
    66: { condition: "sleet", text: "Freezing Rain" },
    67: { condition: "sleet", text: "Heavy Freezing Rain" },
    71: { condition: "snow", text: "Slight Snow" },
    73: { condition: "snow", text: "Moderate Snow" },
    75: { condition: "heavy-snow", text: "Heavy Snow" },
    77: { condition: "snow", text: "Snow Grains" },
    80: { condition: "rain", text: "Slight Rain Showers" },
    81: { condition: "rain", text: "Moderate Rain Showers" },
    82: { condition: "heavy-rain", text: "Violent Rain Showers" },
    85: { condition: "snow", text: "Slight Snow Showers" },
    86: { condition: "heavy-snow", text: "Heavy Snow Showers" },
    95: { condition: "thunderstorm", text: "Thunderstorm" },
    96: { condition: "thunderstorm", text: "Thunderstorm with Hail" },
    99: { condition: "thunderstorm", text: "Thunderstorm with Heavy Hail" },
  };
  return map[code] || { condition: "unknown", text: "Unknown" };
}

function mapWeatherAPICondition(code: number): WeatherCondition {
  // WeatherAPI condition codes mapping
  if (code === 1000) return "clear";
  if (code === 1003) return "partly-cloudy";
  if ([1006, 1009].includes(code)) return "cloudy";
  if ([1030, 1135, 1147].includes(code)) return "fog";
  if ([1063, 1150, 1153, 1168, 1171].includes(code)) return "drizzle";
  if ([1180, 1183, 1186, 1189, 1198, 1240].includes(code)) return "rain";
  if ([1192, 1195, 1201, 1243, 1246].includes(code)) return "heavy-rain";
  if ([1066, 1114, 1210, 1213, 1216, 1219, 1255].includes(code)) return "snow";
  if ([1117, 1222, 1225, 1258].includes(code)) return "heavy-snow";
  if ([1069, 1072, 1204, 1207, 1249, 1252].includes(code)) return "sleet";
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return "thunderstorm";
  if ([1237, 1261, 1264].includes(code)) return "hail";
  return "unknown";
}

function mapWttrCondition(code: string): WeatherCondition {
  const c = parseInt(code);
  if ([113].includes(c)) return "clear";
  if ([116].includes(c)) return "partly-cloudy";
  if ([119, 122].includes(c)) return "cloudy";
  if ([143, 248, 260].includes(c)) return "fog";
  if ([176, 263, 266, 281, 284].includes(c)) return "drizzle";
  if ([293, 296, 299, 302, 353].includes(c)) return "rain";
  if ([305, 308, 356, 359].includes(c)) return "heavy-rain";
  if ([179, 227, 320, 323, 326, 368].includes(c)) return "snow";
  if ([230, 329, 332, 335, 338, 371, 395].includes(c)) return "heavy-snow";
  if ([182, 185, 311, 314, 317, 350, 362, 365, 374, 377].includes(c)) return "sleet";
  if ([200, 386, 389, 392].includes(c)) return "thunderstorm";
  return "unknown";
}

// ─── Open-Meteo Adapter ────────────────────────────────────────

export async function fetchOpenMeteo(
  lat: number,
  lon: number
): Promise<WeatherSourceData> {
  const key = cacheKey("open-meteo", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature",
      "is_day", "precipitation", "weather_code", "cloud_cover",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "surface_pressure", "visibility",
    ].join(","),
    minutely_15: ["precipitation"].join(","),
    hourly: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature",
      "precipitation_probability", "precipitation", "weather_code",
      "cloud_cover", "visibility", "wind_speed_10m", "wind_direction_10m",
      "surface_pressure", "uv_index", "is_day",
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min",
      "precipitation_sum", "precipitation_probability_max",
      "wind_speed_10m_max", "uv_index_max", "sunrise", "sunset",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });

  const [res, aqiRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`)
      .catch(() => null)
  ]);

  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const d = await res.json();
  let aqData = null;
  if (aqiRes && aqiRes.ok) aqData = await aqiRes.json();

  const isDay = d.current.is_day === 1;
  const { condition, text } = mapWMOCode(d.current.weather_code, isDay);

  const current: CurrentWeather = {
    temperature: d.current.temperature_2m,
    feelsLike: d.current.apparent_temperature,
    humidity: d.current.relative_humidity_2m,
    windSpeed: d.current.wind_speed_10m,
    windDirection: d.current.wind_direction_10m,
    windGust: d.current.wind_gusts_10m,
    pressure: d.current.surface_pressure,
    visibility: (d.current.visibility || 10000) / 1000,
    uvIndex: 0, // not in current
    dewPoint: 0,
    cloudCover: d.current.cloud_cover,
    precipitation: d.current.precipitation,
    condition,
    conditionText: text,
    isDay,
  };

  const minutely: import("@/types/weather").MinutelyForecast[] = d.minutely_15?.time.slice(0, 4).map(
    (t: string, i: number) => ({
      time: t,
      precipitation: d.minutely_15.precipitation[i],
    })
  ) || [];

  const hourly: HourlyForecast[] = d.hourly.time.slice(0, 48).map(
    (t: string, i: number) => {
      const hIsDay = d.hourly.is_day[i] === 1;
      const h = mapWMOCode(d.hourly.weather_code[i], hIsDay);
      return {
        time: t,
        temperature: d.hourly.temperature_2m[i],
        feelsLike: d.hourly.apparent_temperature[i],
        humidity: d.hourly.relative_humidity_2m[i],
        windSpeed: d.hourly.wind_speed_10m[i],
        windDirection: d.hourly.wind_direction_10m[i],
        pressure: d.hourly.surface_pressure[i],
        precipitation: d.hourly.precipitation[i],
        precipitationProbability: d.hourly.precipitation_probability[i],
        cloudCover: d.hourly.cloud_cover[i],
        visibility: (d.hourly.visibility?.[i] || 10000) / 1000,
        uvIndex: d.hourly.uv_index[i],
        condition: h.condition,
        conditionText: h.text,
        isDay: hIsDay,
      };
    }
  );

  const daily: DailyForecast[] = d.daily.time.map(
    (t: string, i: number) => {
      const dd = mapWMOCode(d.daily.weather_code[i], true);
      return {
        date: t,
        tempMax: d.daily.temperature_2m_max[i],
        tempMin: d.daily.temperature_2m_min[i],
        avgHumidity: 0,
        maxWindSpeed: d.daily.wind_speed_10m_max[i],
        totalPrecipitation: d.daily.precipitation_sum[i],
        precipitationProbability: d.daily.precipitation_probability_max[i],
        uvIndex: d.daily.uv_index_max[i],
        sunrise: d.daily.sunrise[i],
        sunset: d.daily.sunset[i],
        condition: dd.condition,
        conditionText: dd.text,
      };
    }
  );

  let airQuality: AirQuality | undefined = undefined;
  let pollen: import("@/types/weather").Pollen | undefined = undefined;
  
  if (aqData?.current) {
    const c = aqData.current;
    airQuality = {
      pm25: c.pm2_5,
      pm10: c.pm10,
      o3: c.ozone,
      no2: c.nitrogen_dioxide,
      so2: c.sulphur_dioxide,
      co: c.carbon_monoxide,
      usAqi: c.us_aqi,
      europeanAqi: c.european_aqi,
    };
    pollen = {
      tree: (c.alder_pollen || 0) + (c.birch_pollen || 0) + (c.olive_pollen || 0),
      grass: c.grass_pollen || 0,
      weed: (c.mugwort_pollen || 0) + (c.ragweed_pollen || 0),
    };
  }

  const result: WeatherSourceData = {
    source: "open-meteo",
    fetchedAt: Date.now(),
    current,
    hourly,
    daily,
    minutely,
    airQuality,
    pollen,
  };

  setCache(key, result);
  return result;
}

// ─── WeatherAPI Adapter ─────────────────────────────────────────

export async function fetchWeatherAPI(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
  if (!apiKey || apiKey === "your_weatherapi_key_here") return null;

  const key = cacheKey("weatherapi", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=7&aqi=yes`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const c = d.current;
    const current: CurrentWeather = {
      temperature: c.temp_c,
      feelsLike: c.feelslike_c,
      humidity: c.humidity,
      windSpeed: c.wind_kph,
      windDirection: c.wind_degree,
      windGust: c.gust_kph,
      pressure: c.pressure_mb,
      visibility: c.vis_km,
      uvIndex: c.uv,
      dewPoint: c.dewpoint_c || 0,
      cloudCover: c.cloud,
      precipitation: c.precip_mm,
      condition: mapWeatherAPICondition(c.condition.code),
      conditionText: c.condition.text,
      isDay: c.is_day === 1,
    };

    const hourly: HourlyForecast[] = [];
    d.forecast.forecastday.forEach((day: { hour: Array<{
      time: string; temp_c: number; feelslike_c: number; humidity: number;
      wind_kph: number; wind_degree: number; pressure_mb: number;
      precip_mm: number; chance_of_rain: number; cloud: number;
      vis_km: number; uv: number; condition: { code: number; text: string };
      is_day: number;
    }> }) => {
      day.hour.forEach((h) => {
        hourly.push({
          time: h.time.replace(" ", "T"),
          temperature: h.temp_c,
          feelsLike: h.feelslike_c,
          humidity: h.humidity,
          windSpeed: h.wind_kph,
          windDirection: h.wind_degree,
          pressure: h.pressure_mb,
          precipitation: h.precip_mm,
          precipitationProbability: h.chance_of_rain,
          cloudCover: h.cloud,
          visibility: h.vis_km,
          uvIndex: h.uv,
          condition: mapWeatherAPICondition(h.condition.code),
          conditionText: h.condition.text,
          isDay: h.is_day === 1,
        });
      });
    });

    const daily: DailyForecast[] = d.forecast.forecastday.map(
      (day: {
        date: string;
        day: {
          maxtemp_c: number; mintemp_c: number; avghumidity: number;
          maxwind_kph: number; totalprecip_mm: number; daily_chance_of_rain: number;
          uv: number; condition: { code: number; text: string };
        };
        astro: { sunrise: string; sunset: string };
      }) => ({
        date: day.date,
        tempMax: day.day.maxtemp_c,
        tempMin: day.day.mintemp_c,
        avgHumidity: day.day.avghumidity,
        maxWindSpeed: day.day.maxwind_kph,
        totalPrecipitation: day.day.totalprecip_mm,
        precipitationProbability: day.day.daily_chance_of_rain,
        uvIndex: day.day.uv,
        sunrise: day.astro.sunrise,
        sunset: day.astro.sunset,
        condition: mapWeatherAPICondition(day.day.condition.code),
        conditionText: day.day.condition.text,
      })
    );

    const aq = c.air_quality;
    const airQuality: AirQuality | undefined = aq
      ? {
          pm25: aq.pm2_5,
          pm10: aq.pm10,
          o3: aq.o3,
          no2: aq.no2,
          so2: aq.so2,
          co: aq.co,
          usAqi: aq["us-epa-index"],
        }
      : undefined;

    const astro = d.forecast.forecastday[0]?.astro;
    const astronomy: Astronomy | undefined = astro
      ? {
          sunrise: astro.sunrise,
          sunset: astro.sunset,
          moonrise: astro.moonrise,
          moonset: astro.moonset,
          moonPhase: astro.moon_phase,
          moonIllumination: parseInt(astro.moon_illumination),
        }
      : undefined;

    const result: WeatherSourceData = {
      source: "weatherapi",
      fetchedAt: Date.now(),
      current,
      hourly,
      daily,
      airQuality,
      astronomy,
    };

    setCache(key, result);
    return result;
  } catch (err) {
    console.warn("WeatherAPI fetch failed:", err);
    return null;
  }
}

// ─── wttr.in Adapter ────────────────────────────────────────────

export async function fetchWttrIn(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const key = cacheKey("wttr", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://wttr.in/${lat},${lon}?format=j1`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const cc = d.current_condition[0];
    const current: CurrentWeather = {
      temperature: parseFloat(cc.temp_C),
      feelsLike: parseFloat(cc.FeelsLikeC),
      humidity: parseInt(cc.humidity),
      windSpeed: parseFloat(cc.windspeedKmph),
      windDirection: parseInt(cc.winddirDegree),
      windGust: 0,
      pressure: parseFloat(cc.pressure),
      visibility: parseFloat(cc.visibility),
      uvIndex: parseFloat(cc.uvIndex),
      dewPoint: parseFloat(cc.DewPointC || "0"),
      cloudCover: parseInt(cc.cloudcover),
      precipitation: parseFloat(cc.precipMM),
      condition: mapWttrCondition(cc.weatherCode),
      conditionText: cc.weatherDesc[0]?.value || "Unknown",
      isDay: true, // wttr doesn't provide this reliability
    };

    // wttr.in provides 3-day forecasts with hourly
    const hourly: HourlyForecast[] = [];
    d.weather?.forEach((day: { date: string; hourly: Array<{
      time: string; tempC: string; FeelsLikeC: string; humidity: string;
      windspeedKmph: string; winddirDegree: string; pressure: string;
      precipMM: string; chanceofrain: string; cloudcover: string;
      visibility: string; uvIndex: string; weatherCode: string;
      weatherDesc: Array<{ value: string }>;
    }> }) => {
      day.hourly.forEach((h) => {
        const hourNum = parseInt(h.time) / 100;
        const timeStr = `${day.date}T${String(hourNum).padStart(2, "0")}:00`;
        hourly.push({
          time: timeStr,
          temperature: parseFloat(h.tempC),
          feelsLike: parseFloat(h.FeelsLikeC),
          humidity: parseInt(h.humidity),
          windSpeed: parseFloat(h.windspeedKmph),
          windDirection: parseInt(h.winddirDegree),
          pressure: parseFloat(h.pressure),
          precipitation: parseFloat(h.precipMM),
          precipitationProbability: parseInt(h.chanceofrain),
          cloudCover: parseInt(h.cloudcover),
          visibility: parseFloat(h.visibility),
          uvIndex: parseFloat(h.uvIndex),
          condition: mapWttrCondition(h.weatherCode),
          conditionText: h.weatherDesc[0]?.value || "",
          isDay: hourNum >= 6 && hourNum < 20,
        });
      });
    });

    const daily: DailyForecast[] = (d.weather || []).map(
      (day: {
        date: string;
        maxtempC: string; mintempC: string;
        avgtempC: string;
        hourly: Array<{ humidity: string; windspeedKmph: string; chanceofrain: string; uvIndex: string; weatherCode: string; weatherDesc: Array<{ value: string }> }>;
        astronomy: Array<{ sunrise: string; sunset: string }>;
      }) => {
        const maxWind = Math.max(
          ...day.hourly.map((h) => parseFloat(h.windspeedKmph))
        );
        const avgHumidity =
          day.hourly.reduce((s, h) => s + parseInt(h.humidity), 0) /
          day.hourly.length;
        const maxRain = Math.max(
          ...day.hourly.map((h) => parseInt(h.chanceofrain))
        );
        const maxUV = Math.max(
          ...day.hourly.map((h) => parseFloat(h.uvIndex))
        );

        return {
          date: day.date,
          tempMax: parseFloat(day.maxtempC),
          tempMin: parseFloat(day.mintempC),
          avgHumidity: Math.round(avgHumidity),
          maxWindSpeed: maxWind,
          totalPrecipitation: 0,
          precipitationProbability: maxRain,
          uvIndex: maxUV,
          sunrise: day.astronomy?.[0]?.sunrise || "",
          sunset: day.astronomy?.[0]?.sunset || "",
          condition: mapWttrCondition(day.hourly[4]?.weatherCode || "113"),
          conditionText: day.hourly[4]?.weatherDesc?.[0]?.value || "Clear",
        };
      }
    );

    const astro = d.weather?.[0]?.astronomy?.[0];
    const astronomy = astro ? {
      sunrise: astro.sunrise,
      sunset: astro.sunset,
      moonrise: astro.moonrise,
      moonset: astro.moonset,
      moonPhase: astro.moon_phase,
      moonIllumination: parseInt(astro.moon_illumination) || 0,
    } : undefined;

    const result: WeatherSourceData = {
      source: "wttr",
      fetchedAt: Date.now(),
      current,
      hourly,
      daily,
      astronomy,
    };

    setCache(key, result);
    return result;
  } catch (err) {
    console.warn("wttr.in fetch failed:", err);
    return null;
  }
}

// ─── MET Norway Adapter ─────────────────────────────────────────

export async function fetchMetNorway(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const key = cacheKey("met-norway", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
      { headers: { "User-Agent": "WeatherLensApp/1.0" } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    
    const ts = d.properties.timeseries;
    if (!ts || ts.length === 0) return null;

    const c = ts[0].data.instant.details;
    const current: CurrentWeather = {
      temperature: c.air_temperature,
      feelsLike: c.air_temperature, // MET doesn't provide apparent temp in compact
      humidity: c.relative_humidity,
      windSpeed: c.wind_speed * 3.6, // m/s to kph
      windDirection: c.wind_from_direction,
      windGust: (c.wind_speed_of_gust || 0) * 3.6,
      pressure: c.air_pressure_at_sea_level,
      visibility: 10, // Not provided reliably
      uvIndex: c.ultraviolet_index_clear_sky || 0,
      dewPoint: c.dew_point_temperature,
      cloudCover: c.cloud_area_fraction,
      precipitation: ts[0].data.next_1_hours?.details?.precipitation_amount || 0,
      condition: "unknown",
      conditionText: ts[0].data.next_1_hours?.summary?.symbol_code || "Unknown",
      isDay: true,
    };

    const result: WeatherSourceData = {
      source: "met-norway",
      fetchedAt: Date.now(),
      current,
      hourly: [],
      daily: [],
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return null;
  }
}

// ─── OpenWeatherMap Adapter ─────────────────────────────────────

export async function fetchOpenWeatherMap(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const apiKey = import.meta.env.VITE_OPENWEATHERMAP_KEY;
  if (!apiKey || apiKey === "your_openweathermap_key_here") return null;

  const key = cacheKey("openweathermap", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const c = d.current;
    const current: CurrentWeather = {
      temperature: c.temp,
      feelsLike: c.feels_like,
      humidity: c.humidity,
      windSpeed: c.wind_speed * 3.6, // m/s to kph
      windDirection: c.wind_deg,
      windGust: (c.wind_gust || 0) * 3.6,
      pressure: c.pressure,
      visibility: c.visibility / 1000,
      uvIndex: c.uvi,
      dewPoint: c.dew_point,
      cloudCover: c.clouds,
      precipitation: c.rain?.["1h"] || 0,
      condition: "unknown",
      conditionText: c.weather[0]?.main || "Unknown",
      isDay: true,
    };

    const result: WeatherSourceData = {
      source: "openweathermap",
      fetchedAt: Date.now(),
      current,
      hourly: [],
      daily: [],
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return null;
  }
}

// ─── Visual Crossing Adapter ────────────────────────────────────

export async function fetchVisualCrossing(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const apiKey = import.meta.env.VITE_VISUALCROSSING_KEY;
  if (!apiKey || apiKey === "your_visualcrossing_key_here") return null;

  const key = cacheKey("visualcrossing", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}?key=${apiKey}&unitGroup=metric&include=current`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const c = d.currentConditions;
    const current: CurrentWeather = {
      temperature: c.temp,
      feelsLike: c.feelslike,
      humidity: c.humidity,
      windSpeed: c.windspeed,
      windDirection: c.winddir,
      windGust: c.windgust || 0,
      pressure: c.pressure,
      visibility: c.visibility,
      uvIndex: c.uvindex,
      dewPoint: c.dew,
      cloudCover: c.cloudcover,
      precipitation: c.precip || 0,
      condition: "unknown",
      conditionText: c.conditions || "Unknown",
      isDay: true,
    };

    const result: WeatherSourceData = {
      source: "visual-crossing",
      fetchedAt: Date.now(),
      current,
      hourly: [],
      daily: [],
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return null;
  }
}

// ─── Pirate Weather Adapter ─────────────────────────────────────

export async function fetchPirateWeather(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const apiKey = import.meta.env.VITE_PIRATEWEATHER_KEY;
  if (!apiKey || apiKey === "your_pirateweather_key_here") return null;

  const key = cacheKey("pirateweather", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.pirateweather.net/forecast/${apiKey}/${lat},${lon}?units=si`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const c = d.currently;
    const current: CurrentWeather = {
      temperature: c.temperature,
      feelsLike: c.apparentTemperature,
      humidity: c.humidity * 100,
      windSpeed: c.windSpeed * 3.6,
      windDirection: c.windBearing,
      windGust: (c.windGust || 0) * 3.6,
      pressure: c.pressure,
      visibility: c.visibility,
      uvIndex: c.uvIndex,
      dewPoint: c.dewPoint,
      cloudCover: c.cloudCover * 100,
      precipitation: c.precipIntensity || 0,
      condition: "unknown",
      conditionText: c.summary || "Unknown",
      isDay: true,
    };

    const minutely: import("@/types/weather").MinutelyForecast[] = (d.minutely?.data || []).map((m: any) => ({
      time: new Date(m.time * 1000).toISOString(),
      precipitation: m.precipIntensity || 0,
    }));

    const result: WeatherSourceData = {
      source: "pirate-weather",
      fetchedAt: Date.now(),
      current,
      hourly: [],
      daily: [],
      minutely,
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return null;
  }
}

// ─── Tomorrow.io Adapter ────────────────────────────────────────

export async function fetchTomorrowIo(
  lat: number,
  lon: number
): Promise<WeatherSourceData | null> {
  const apiKey = import.meta.env.VITE_TOMORROWIO_KEY;
  if (!apiKey || apiKey === "your_tomorrowio_key_here") return null;

  const key = cacheKey("tomorrowio", lat, lon);
  const cached = getCached<WeatherSourceData>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${apiKey}&units=metric&timesteps=1m,1h,1d`
    );
    if (!res.ok) return null;
    const d = await res.json();

    const minutelyTimeline = d.timelines.minutely || [];
    const hourlyTimeline = d.timelines.hourly || [];
    const dailyTimeline = d.timelines.daily || [];

    const minutely: import("@/types/weather").MinutelyForecast[] = minutelyTimeline.map((m: any) => ({
      time: m.time,
      precipitation: m.values.precipitationIntensity || 0,
    }));

    const cv = hourlyTimeline[0]?.values || minutelyTimeline[0]?.values || {};
    const current: CurrentWeather = {
      temperature: cv.temperature || 0,
      feelsLike: cv.apparentTemperature || 0,
      humidity: cv.humidity || 0,
      windSpeed: (cv.windSpeed || 0) * 3.6, // m/s to kph
      windDirection: cv.windDirection || 0,
      windGust: (cv.windGust || 0) * 3.6,
      pressure: cv.pressureSurfaceLevel || 1013,
      visibility: cv.visibility || 10,
      uvIndex: cv.uvIndex || 0,
      dewPoint: cv.dewPoint || 0,
      cloudCover: cv.cloudCover || 0,
      precipitation: cv.precipitationIntensity || 0,
      condition: "unknown",
      conditionText: "Unknown",
      isDay: true,
    };

    const result: WeatherSourceData = {
      source: "tomorrow-io",
      fetchedAt: Date.now(),
      current,
      hourly: [],
      daily: [],
      minutely,
    };
    setCache(key, result);
    return result;
  } catch (err) {
    return null;
  }
}

// ─── Fetch All Sources ──────────────────────────────────────────

export async function fetchAllSources(
  lat: number,
  lon: number
): Promise<WeatherSourceData[]> {
  const results = await Promise.allSettled([
    fetchOpenMeteo(lat, lon),
    fetchWeatherAPI(lat, lon),
    fetchWttrIn(lat, lon),
    fetchMetNorway(lat, lon),
    fetchOpenWeatherMap(lat, lon),
    fetchVisualCrossing(lat, lon),
    fetchPirateWeather(lat, lon),
    fetchTomorrowIo(lat, lon)
  ]);

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r): r is WeatherSourceData => r !== null);
}
