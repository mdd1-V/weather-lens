import type { DailyForecast } from "@/types/weather";
import { WeatherIcon } from "./WeatherIcon";
import { motion } from "framer-motion";
import { Droplets } from "lucide-react";

interface DailyForecastProps {
  daily: DailyForecast[];
}

function formatDay(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString([], { weekday: "short" });
}

export function DailyForecastList({ daily }: DailyForecastProps) {
  // Find global temperature range for the visual bar
  const globalMin = Math.min(...daily.map((d) => d.tempMin));
  const globalMax = Math.max(...daily.map((d) => d.tempMax));
  const range = globalMax - globalMin || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="relative z-10 mx-4 mt-3"
    >
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 px-1">
          7-Day Forecast
        </h3>

        <div className="space-y-1">
          {daily.map((day, index) => {
            const leftPct = ((day.tempMin - globalMin) / range) * 100;
            const widthPct = ((day.tempMax - day.tempMin) / range) * 100;

            return (
              <div
                key={day.date}
                className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                {/* Day name */}
                <span className="text-sm text-white/80 w-20 shrink-0">
                  {formatDay(day.date, index)}
                </span>

                {/* Precipitation */}
                <div className="flex items-center gap-0.5 w-12 shrink-0">
                  {day.precipitationProbability > 0 ? (
                    <>
                      <Droplets size={12} className="text-blue-300" />
                      <span className="text-xs text-blue-300">
                        {day.precipitationProbability}%
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-white/20">—</span>
                  )}
                </div>

                {/* Icon */}
                <div className="w-6 shrink-0">
                  <WeatherIcon
                    condition={day.condition}
                    isDay={true}
                    size={18}
                    className="text-white/80"
                  />
                </div>

                {/* Min temp */}
                <span className="text-xs text-white/50 w-8 text-right shrink-0">
                  {Math.round(day.tempMin)}°
                </span>

                {/* Temperature bar */}
                <div className="flex-1 h-1.5 rounded-full bg-white/10 relative mx-1">
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 4)}%`,
                      background: `linear-gradient(90deg, #60a5fa, #f59e0b)`,
                    }}
                  />
                </div>

                {/* Max temp */}
                <span className="text-xs text-white w-8 shrink-0">
                  {Math.round(day.tempMax)}°
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
