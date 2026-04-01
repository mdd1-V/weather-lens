import type { ConsensusResult } from "@/types/weather";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  Wind, Droplets, Eye, Gauge, Thermometer, Sun,
  Sunrise, Sunset, Navigation, CloudRain,
} from "lucide-react";

interface WeatherDetailsProps {
  consensus: ConsensusResult;
}

interface DetailCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  confidence?: number;
  sources?: Array<{ source: string; value: number; isOutlier: boolean }>;
  delay: number;
}

function DetailCard({
  icon, label, value, subtitle, confidence, sources, delay,
}: DetailCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4 h-full hover:bg-white/8 transition-colors cursor-default">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-white/50">{icon}</div>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            {label}
          </span>
          {confidence !== undefined && (
            <div
              className={`ml-auto w-1.5 h-1.5 rounded-full ${
                confidence >= 80
                  ? "bg-emerald-400"
                  : confidence >= 50
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            />
          )}
        </div>
        <div className="text-xl font-light text-white">{value}</div>
        {subtitle && (
          <p className="text-xs text-white/40 mt-1">{subtitle}</p>
        )}
      </Card>
    </motion.div>
  );

  if (sources && sources.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="bg-black/80 backdrop-blur-md border-white/10 text-white">
          <div className="space-y-1 text-xs">
            {sources.map((s) => (
              <div key={s.source} className="flex justify-between gap-3">
                <span className={s.isOutlier ? "text-amber-400" : "text-emerald-400"}>
                  {s.source}
                </span>
                <span>{s.value}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function windDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function uvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

function pressureTrend(pressure: number): string {
  if (pressure > 1020) return "High pressure";
  if (pressure < 1000) return "Low pressure";
  return "Normal";
}

export function WeatherDetailsGrid({ consensus }: WeatherDetailsProps) {
  const c = consensus.current;
  const a = consensus.astronomy;

  const cards: DetailCardProps[] = [
    {
      icon: <Wind size={16} />,
      label: "Wind",
      value: `${Math.round(c.windSpeed.value)} km/h`,
      subtitle: `${windDirectionLabel(c.windDirection.value)} • Gusts may reach higher`,
      confidence: c.windSpeed.confidence,
      sources: c.windSpeed.sources,
      delay: 0.7,
    },
    {
      icon: <Droplets size={16} />,
      label: "Humidity",
      value: `${Math.round(c.humidity.value)}%`,
      subtitle: c.humidity.value > 70 ? "High humidity" : c.humidity.value < 30 ? "Dry air" : "Comfortable",
      confidence: c.humidity.confidence,
      sources: c.humidity.sources,
      delay: 0.75,
    },
    {
      icon: <Sun size={16} />,
      label: "UV Index",
      value: `${c.uvIndex.value}`,
      subtitle: uvLabel(c.uvIndex.value),
      confidence: c.uvIndex.confidence,
      sources: c.uvIndex.sources,
      delay: 0.8,
    },
    {
      icon: <Eye size={16} />,
      label: "Visibility",
      value: `${c.visibility.value} km`,
      subtitle: c.visibility.value > 10 ? "Crystal clear" : c.visibility.value > 5 ? "Good" : "Reduced",
      confidence: c.visibility.confidence,
      sources: c.visibility.sources,
      delay: 0.85,
    },
    {
      icon: <Gauge size={16} />,
      label: "Pressure",
      value: `${Math.round(c.pressure.value)} hPa`,
      subtitle: pressureTrend(c.pressure.value),
      confidence: c.pressure.confidence,
      sources: c.pressure.sources,
      delay: 0.9,
    },
    {
      icon: <Thermometer size={16} />,
      label: "Dew Point",
      value: `${Math.round(c.dewPoint.value)}°C`,
      subtitle: c.dewPoint.value > 20 ? "Muggy" : c.dewPoint.value > 10 ? "Comfortable" : "Dry",
      confidence: c.dewPoint.confidence,
      sources: c.dewPoint.sources,
      delay: 0.95,
    },
    {
      icon: <Navigation size={16} style={{ transform: `rotate(${c.windDirection.value}deg)` }} />,
      label: "Wind Direction",
      value: windDirectionLabel(c.windDirection.value),
      subtitle: `${Math.round(c.windDirection.value)}°`,
      confidence: c.windDirection.confidence,
      delay: 1.0,
    },
    {
      icon: <CloudRain size={16} />,
      label: "Precipitation",
      value: `${c.precipitation.value} mm`,
      subtitle: c.precipitation.value > 0 ? "Active precipitation" : "No precipitation",
      confidence: c.precipitation.confidence,
      sources: c.precipitation.sources,
      delay: 1.05,
    },
  ];



  return (
    <div className="relative z-10 mx-4 mt-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {cards.map((card) => (
          <DetailCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}
