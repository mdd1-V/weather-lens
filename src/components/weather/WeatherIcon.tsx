import type { WeatherCondition } from "@/types/weather";
import {
  Cloud, CloudDrizzle, CloudFog, CloudHail, CloudLightning,
  CloudRain, CloudSnow, CloudSun, Snowflake, Sun, Moon, Wind,
} from "lucide-react";

interface WeatherIconProps {
  condition: WeatherCondition;
  isDay?: boolean;
  size?: number;
  className?: string;
}

export function WeatherIcon({
  condition,
  isDay = true,
  size = 24,
  className = "",
}: WeatherIconProps) {
  const props = { size, className };

  switch (condition) {
    case "clear":
      return isDay ? <Sun {...props} /> : <Moon {...props} />;
    case "partly-cloudy":
      return isDay ? <CloudSun {...props} /> : <Cloud {...props} />;
    case "cloudy":
    case "overcast":
      return <Cloud {...props} />;
    case "fog":
      return <CloudFog {...props} />;
    case "drizzle":
      return <CloudDrizzle {...props} />;
    case "rain":
      return <CloudRain {...props} />;
    case "heavy-rain":
      return <CloudRain {...props} />;
    case "snow":
      return <Snowflake {...props} />;
    case "heavy-snow":
      return <CloudSnow {...props} />;
    case "sleet":
      return <CloudHail {...props} />;
    case "thunderstorm":
      return <CloudLightning {...props} />;
    case "hail":
      return <CloudHail {...props} />;
    default:
      return <Wind {...props} />;
  }
}
