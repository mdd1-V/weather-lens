// ─── Shared Weather Types ───────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  name: string;
  region: string;
  country: string;
  coordinates: Coordinates;
}

// ─── Weather Condition Codes ────────────────────────────────────

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "snow"
  | "heavy-snow"
  | "sleet"
  | "thunderstorm"
  | "hail"
  | "unknown";

// ─── Normalized Data from Any Source ────────────────────────────

export interface CurrentWeather {
  temperature: number;         // °C
  feelsLike: number;           // °C
  humidity: number;            // %
  windSpeed: number;           // km/h
  windDirection: number;       // degrees
  windGust: number;            // km/h
  pressure: number;            // hPa
  visibility: number;          // km
  uvIndex: number;
  dewPoint: number;            // °C
  cloudCover: number;          // %
  precipitation: number;       // mm
  condition: WeatherCondition;
  conditionText: string;
  isDay: boolean;
}

export interface HourlyForecast {
  time: string;                // ISO timestamp
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  precipitation: number;
  precipitationProbability: number; // %
  cloudCover: number;
  visibility: number;
  uvIndex: number;
  condition: WeatherCondition;
  conditionText: string;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;                // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  avgHumidity: number;
  maxWindSpeed: number;
  totalPrecipitation: number;
  precipitationProbability: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  condition: WeatherCondition;
  conditionText: string;
}

export interface AirQuality {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  usAqi: number;             // US EPA index
  europeanAqi?: number;      // EU AQI
}

export interface Pollen {
  tree: number;
  grass: number;
  weed: number;
}

export interface MinutelyForecast {
  time: string;              // ISO timestamp
  precipitation: number;     // mm/h
}

export interface Astronomy {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moonPhase: string;
  moonIllumination: number;  // %
}

// ─── Source-Specific Wrapper ────────────────────────────────────

export interface WeatherSourceData {
  source: "open-meteo" | "weatherapi" | "wttr" | "met-norway" | "openweathermap" | "visual-crossing" | "pirate-weather" | "tomorrow-io";
  fetchedAt: number;           // timestamp ms
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  minutely?: MinutelyForecast[];
  airQuality?: AirQuality;
  pollen?: Pollen;
  astronomy?: Astronomy;
}

// ─── Consensus Engine Output ────────────────────────────────────

export interface SourceValue {
  source: string;
  value: number;
  isOutlier: boolean;
}

export interface MetricConsensus {
  value: number;
  confidence: number;          // 0-100
  sources: SourceValue[];
}

export interface ConsensusResult {
  location: LocationInfo;
  current: {
    temperature: MetricConsensus;
    feelsLike: MetricConsensus;
    humidity: MetricConsensus;
    windSpeed: MetricConsensus;
    windDirection: MetricConsensus;
    pressure: MetricConsensus;
    visibility: MetricConsensus;
    uvIndex: MetricConsensus;
    dewPoint: MetricConsensus;
    cloudCover: MetricConsensus;
    precipitation: MetricConsensus;
    condition: WeatherCondition;
    conditionText: string;
    isDay: boolean;
  };
  hourly: HourlyForecast[];    // best-source hourly data
  daily: DailyForecast[];      // best-source daily data
  minutely?: MinutelyForecast[]; // synthesized minutely rain
  nowcastText?: string;        // e.g. "Rain starting in 15 mins"
  airQuality?: AirQuality;
  pollen?: Pollen;
  astronomy?: Astronomy;
  sources: WeatherSourceData[];
  overallConfidence: number;
  lastUpdated: number;
}

// ─── Radar / Map Types ──────────────────────────────────────────

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarData {
  host: string;
  past: RadarFrame[];
  nowcast: RadarFrame[];
}

// ─── App State ──────────────────────────────────────────────────

export type AppTab = "weather" | "analytics" | "map";

export interface AppState {
  location: LocationInfo | null;
  consensus: ConsensusResult | null;
  radar: RadarData | null;
  loading: boolean;
  error: string | null;
  activeTab: AppTab;
}
