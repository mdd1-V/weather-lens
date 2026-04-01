import type { ConsensusResult } from "@/types/weather";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Database, Check, AlertTriangle } from "lucide-react";

interface SourceComparisonProps {
  consensus: ConsensusResult;
}

export function SourceComparison({ consensus }: SourceComparisonProps) {
  const { sources, current } = consensus;

  const metrics = [
    { key: "temperature", label: "Temperature", unit: "°C", consensus: current.temperature },
    { key: "feelsLike", label: "Feels Like", unit: "°C", consensus: current.feelsLike },
    { key: "humidity", label: "Humidity", unit: "%", consensus: current.humidity },
    { key: "windSpeed", label: "Wind Speed", unit: "km/h", consensus: current.windSpeed },
    { key: "pressure", label: "Pressure", unit: "hPa", consensus: current.pressure },
    { key: "visibility", label: "Visibility", unit: "km", consensus: current.visibility },
    { key: "cloudCover", label: "Cloud Cover", unit: "%", consensus: current.cloudCover },
    { key: "uvIndex", label: "UV Index", unit: "", consensus: current.uvIndex },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="relative z-10 mx-4 mt-3"
    >
      <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-white/80">Source Data Comparison</h3>
        </div>

        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-white/40 font-medium">Metric</th>
              {sources.map((s) => (
                <th key={s.source} className="text-center py-2 px-2 text-white/40 font-medium">
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/60">
                    {s.source}
                  </Badge>
                </th>
              ))}
              <th className="text-center py-2 px-2 text-white/40 font-medium">
                <Badge className="text-[10px] bg-sky-500/20 text-sky-300 border-sky-500/30">
                  Consensus
                </Badge>
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2 px-2 text-white/60">{m.label}</td>
                {sources.map((s) => {
                  const rawValue = s.current[m.key as keyof typeof s.current] as number;
                  const isOutlier = m.consensus.sources.find(
                    (sv) => sv.source === s.source
                  )?.isOutlier;

                  return (
                    <td key={s.source} className="text-center py-2 px-2">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isOutlier ? "text-amber-400" : "text-white/80"
                        }`}
                      >
                        {typeof rawValue === "number" ? Math.round(rawValue * 10) / 10 : rawValue}
                        {m.unit}
                        {isOutlier ? (
                          <AlertTriangle size={10} className="text-amber-400" />
                        ) : (
                          <Check size={10} className="text-emerald-400/60" />
                        )}
                      </span>
                    </td>
                  );
                })}
                <td className="text-center py-2 px-2 text-sky-300 font-medium">
                  {Math.round(m.consensus.value * 10) / 10}{m.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </motion.div>
  );
}
