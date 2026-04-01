import type { ConsensusResult } from "@/types/weather";
import { WeatherIcon } from "./WeatherIcon";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface CurrentWeatherProps {
  consensus: ConsensusResult;
  onRefresh: () => void;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (confidence >= 50) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-red-500/20 text-red-300 border-red-500/30";
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}

export function CurrentWeatherDisplay({ consensus, onRefresh }: CurrentWeatherProps) {
  const { current, location } = consensus;
  const temp = current.temperature.value;
  const feelsLike = current.feelsLike.value;
  const humidity = current.humidity.value;
  const windSpeed = current.windSpeed.value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 flex flex-col items-center justify-center py-8 px-4 text-white"
    >
      {/* Location */}
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={16} className="text-white/70" />
        <span className="text-sm text-white/80 font-medium">
          {location.name}
          {location.region ? `, ${location.region}` : ""}
        </span>
        <button
          onClick={onRefresh}
          className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          title="Refresh weather data"
        >
          <RefreshCw size={14} className="text-white/60" />
        </button>
      </div>

      {/* Condition Icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="my-4"
      >
        <WeatherIcon
          condition={current.condition}
          isDay={current.isDay}
          size={64}
          className="text-white drop-shadow-lg"
        />
      </motion.div>

      {/* Temperature */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex items-start"
      >
        <Tooltip>
          <TooltipTrigger>
            <span className="text-8xl md:text-9xl font-extralight tracking-tighter leading-none">
              {Math.round(temp)}
            </span>
            <span className="text-3xl md:text-4xl font-light mt-2">°C</span>
          </TooltipTrigger>
          <TooltipContent className="bg-black/80 backdrop-blur-md border-white/10 text-white max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold mb-1">Source Breakdown:</p>
              {current.temperature.sources.map((s) => (
                <div key={s.source} className="flex justify-between gap-4">
                  <span className={s.isOutlier ? "text-amber-400" : "text-emerald-400"}>
                    {s.source}
                  </span>
                  <span>{s.value}°C {s.isOutlier ? "⚠️" : "✓"}</span>
                </div>
              ))}
              <div className="border-t border-white/20 mt-1 pt-1 flex justify-between">
                <span className="font-semibold">Consensus</span>
                <span>{temp}°C ({current.temperature.confidence}% confident)</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </motion.div>

      {/* Condition Text */}
      <p className="text-lg text-white/90 font-light mt-2">
        {current.conditionText}
      </p>

      {/* Nowcast Alert */}
      {consensus.nowcastText && (
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="mt-4 bg-sky-500/20 backdrop-blur-md border border-sky-400/30 text-sky-100 px-5 py-2 rounded-full text-sm font-medium flex items-center shadow-[0_0_15px_rgba(56,189,248,0.2)]"
        >
           <span className="relative flex h-2.5 w-2.5 mr-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
           </span>
           {consensus.nowcastText}
        </motion.div>
      )}

      {/* Feels Like & Details */}
      <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
        <span>Feels like {Math.round(feelsLike)}°</span>
        <span className="w-1 h-1 rounded-full bg-white/30" />
        <span>H: {Math.round(humidity)}%</span>
        <span className="w-1 h-1 rounded-full bg-white/30" />
        <span>W: {Math.round(windSpeed)} km/h</span>
      </div>

      {/* Confidence Badge */}
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="outline"
            className={`mt-4 ${confidenceColor(consensus.overallConfidence)} border cursor-help`}
          >
            {consensus.sources.length} sources • {confidenceLabel(consensus.overallConfidence)} confidence ({consensus.overallConfidence}%)
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-black/80 backdrop-blur-md border-white/10 text-white">
          <p className="text-xs">
            Data from: {consensus.sources.map((s) => s.source).join(", ")}
          </p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
