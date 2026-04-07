import type { ConsensusResult } from "@/types/weather";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Activity, BarChart3, Wind, Biohazard, Leaf } from "lucide-react";

interface AnalyticsDashboardProps {
  consensus: ConsensusResult;
}

function formatHour(timeStr: string): string {
  return new Date(timeStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "text-emerald-400" };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-400" };
  if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "text-orange-400" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-400" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-400" };
  return { label: "Hazardous", color: "text-rose-500" };
}

export function AnalyticsDashboard({ consensus }: AnalyticsDashboardProps) {
  const { hourly, sources, airQuality } = consensus;

  // Prepare hourly chart data (next 24 hours)
  const now = Date.now();
  const next24 = hourly
    .filter((h) => new Date(h.time).getTime() >= now - 3600000)
    .slice(0, 24);

  const tempChartData = next24.map((h) => ({
    time: formatHour(h.time),
    temperature: h.temperature,
    feelsLike: h.feelsLike,
  }));

  const precipChartData = next24.map((h) => ({
    time: formatHour(h.time),
    probability: h.precipitationProbability,
    amount: h.precipitation,
  }));

  // Source comparison data for radar chart
  const radarData = [
    { metric: "Temp", ...Object.fromEntries(sources.map((s) => [s.source, s.current.temperature])) },
    { metric: "Humidity", ...Object.fromEntries(sources.map((s) => [s.source, s.current.humidity])) },
    { metric: "Wind", ...Object.fromEntries(sources.map((s) => [s.source, s.current.windSpeed])) },
    { metric: "Cloud", ...Object.fromEntries(sources.map((s) => [s.source, s.current.cloudCover])) },
    { metric: "Pressure", ...Object.fromEntries(sources.map((s) => [s.source, (s.current.pressure - 950) * 2])) },
    { metric: "Visibility", ...Object.fromEntries(sources.map((s) => [s.source, s.current.visibility * 5])) },
  ];

  const sourceColors: Record<string, string> = {
    "open-meteo": "#38bdf8",
    "weatherapi": "#a78bfa",
    "wttr": "#34d399",
  };

  // Source agreement matrix
  const metrics = ["temperature", "humidity", "windSpeed", "pressure", "cloudCover"] as const;
  const agreementData = metrics.map((metric) => {
    const values = sources.map((s) => s.current[metric as keyof typeof s.current] as number);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const maxDev = Math.max(...values.map((v) => Math.abs(v - avg)));
    const agreement = avg !== 0 ? Math.max(0, 100 - (maxDev / Math.abs(avg)) * 100) : 100;
    return { metric, agreement: Math.round(agreement) };
  });

  return (
    <div className="space-y-4">
      {/* Temperature Chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-white/80">Temperature Forecast (24h)</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempChartData}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="feelsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  domain={["auto", "auto"]}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    backdropFilter: "blur(8px)",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#38bdf8"
                  fill="url(#tempGrad)"
                  strokeWidth={2}
                  name="Temperature (°C)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="feelsLike"
                  stroke="#f59e0b"
                  fill="url(#feelsGrad)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  name="Feels Like (°C)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Precipitation Chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white/80">Precipitation Probability (24h)</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={precipChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  domain={[0, 100]}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="probability"
                  fill="#60a5fa"
                  radius={[4, 4, 0, 0]}
                  name="Probability (%)"
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Source Comparison Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wind size={16} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-white/80">Source Comparison</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                  />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  {sources.map((s) => (
                    <Radar
                      key={s.source}
                      name={s.source}
                      dataKey={s.source}
                      stroke={sourceColors[s.source] || "#888"}
                      fill={sourceColors[s.source] || "#888"}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Source Agreement */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Source Agreement</h3>
            <div className="space-y-3">
              {agreementData.map((item) => (
                <div key={item.metric} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60 capitalize">{item.metric}</span>
                    <span
                      className={
                        item.agreement >= 80
                          ? "text-emerald-400"
                          : item.agreement >= 50
                          ? "text-amber-400"
                          : "text-red-400"
                      }
                    >
                      {item.agreement}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.agreement}%` }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          item.agreement >= 80
                            ? "linear-gradient(90deg, #34d399, #10b981)"
                            : item.agreement >= 50
                            ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                            : "linear-gradient(90deg, #f87171, #ef4444)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Active Sources</span>
                <div className="flex gap-1">
                  {sources.map((s) => (
                    <Badge
                      key={s.source}
                      variant="outline"
                      className="text-[10px] border-white/10 text-white/60"
                    >
                      {s.source}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Air Quality & Pollen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {airQuality && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex-1"
          >
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Biohazard size={16} className="text-green-400" />
                <h3 className="text-sm font-semibold text-white/80">Air Quality</h3>
                <Badge
                  variant="outline"
                  className={`ml-auto border-white/10 ${aqiLabel(airQuality.usAqi || 1).color}`}
                >
                  {aqiLabel(airQuality.usAqi || 1).label}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {[
                  { label: "PM2.5", value: airQuality.pm25, unit: "μg/m³" },
                  { label: "O₃", value: airQuality.o3, unit: "μg/m³" },
                  { label: "NO₂", value: airQuality.no2, unit: "μg/m³" },
                  { label: "PM10", value: airQuality.pm10, unit: "μg/m³" },
                  { label: "SO₂", value: airQuality.so2, unit: "μg/m³" },
                  { label: "CO", value: airQuality.co, unit: "μg/m³" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-xs text-white/40">{item.label}</p>
                    <p className="text-lg font-light text-white mt-1 mb-1">
                      {Math.round(item.value * 10) / 10}
                    </p>
                    <p className="text-[9px] text-white/30 truncate">{item.unit}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {consensus.pollen && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex-1"
          >
            <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <Leaf size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white/80">Pollen Forecast</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1 items-center">
                {[
                  { label: "Tree", value: consensus.pollen.tree },
                  { label: "Grass", value: consensus.pollen.grass },
                  { label: "Weed", value: consensus.pollen.weed },
                ].map((p) => {
                  let labelColor = "text-emerald-400";
                  if (p.value > 10) labelColor = "text-yellow-400";
                  if (p.value > 50) labelColor = "text-orange-400";
                  if (p.value > 150) labelColor = "text-red-400";

                  return (
                    <div key={p.label} className="text-center p-2 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-xs text-white/50 mb-2">{p.label}</p>
                      <p className={`text-xl font-medium ${labelColor}`}>
                        {Math.round(p.value)}
                      </p>
                      <p className="text-[9px] mt-1 text-white/30">grains/m³</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
