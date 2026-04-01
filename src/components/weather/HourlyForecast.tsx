import type { HourlyForecast } from "@/types/weather";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { WeatherIcon } from "./WeatherIcon";
import { motion } from "framer-motion";
import { Droplets } from "lucide-react";

interface HourlyForecastProps {
  hourly: HourlyForecast[];
}

function formatHour(timeStr: string): string {
  const date = new Date(timeStr);
  const now = new Date();
  const diffH = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
  if (diffH >= -1 && diffH <= 0) return "Now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function HourlyForecastStrip({ hourly }: HourlyForecastProps) {
  // Show next 24 hours from current time
  const now = Date.now();
  const filtered = hourly.filter((h) => new Date(h.time).getTime() >= now - 3600000).slice(0, 25);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="relative z-10"
    >
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 mx-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 px-1">
          Hourly Forecast
        </h3>
        <ScrollArea className="w-full">
          <div className="flex gap-1">
            {filtered.map((hour, index) => (
              <div
                key={hour.time}
                className={`flex flex-col items-center min-w-[60px] py-2 px-2 rounded-xl transition-colors ${
                  index === 0 ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span className="text-[10px] text-white/60 font-medium">
                  {formatHour(hour.time)}
                </span>

                {hour.precipitationProbability > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    <Droplets size={8} className="text-blue-300" />
                    <span className="text-[9px] text-blue-300">
                      {hour.precipitationProbability}%
                    </span>
                  </div>
                )}

                <div className="my-2">
                  <WeatherIcon
                    condition={hour.condition}
                    isDay={hour.isDay}
                    size={20}
                    className="text-white/90"
                  />
                </div>

                <span className="text-sm font-medium text-white">
                  {Math.round(hour.temperature)}°
                </span>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="opacity-30" />
        </ScrollArea>
      </div>
    </motion.div>
  );
}
