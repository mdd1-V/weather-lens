import React from "react";
import { motion } from "framer-motion";
import { Sunrise, Sunset, Moon, Sun, Eclipse } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ConsensusResult } from "@/types/weather";

interface AstrophysicsDashboardProps {
  consensus: ConsensusResult;
}

function parseTimeToMinutes(timeStr: string): number {
  // Format is typically "06:30 AM" or "18:30"
  if (!timeStr) return 0;
  
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    const isPM = timeStr.includes("PM");
    const [time] = timeStr.split(" ");
    let [hours, mins] = time.split(":").map(Number);
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  
  const [hours, mins] = timeStr.split(":").map(Number);
  return hours * 60 + mins;
}

export function AstrophysicsDashboard({ consensus }: AstrophysicsDashboardProps) {
  const ast = consensus.astronomy;
  
  if (!ast) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const sunriseMins = parseTimeToMinutes(ast.sunrise);
  const sunsetMins = parseTimeToMinutes(ast.sunset);
  
  // Calculate percentage of day
  const totalDaylight = sunsetMins - sunriseMins;
  let dayPercentage = 0;
  
  if (totalDaylight > 0) {
    if (currentMinutes < sunriseMins) dayPercentage = 0;
    else if (currentMinutes > sunsetMins) dayPercentage = 100;
    else dayPercentage = ((currentMinutes - sunriseMins) / totalDaylight) * 100;
  }

  // Calculate moon icon and label based on phase
  let MoonIcon = Moon;
  let phaseLabel = ast.moonPhase || "Unknown Phase";
  
  const phaseLower = phaseLabel.toLowerCase();
  if (phaseLower.includes("full")) MoonIcon = Eclipse;
  else if (phaseLower.includes("new")) MoonIcon = Eclipse; // Maybe full black? Let's just use Eclipse for uniqueness
  else if (phaseLower.includes("crescent")) MoonIcon = Moon;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Solar Tracker / Golden Hour */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-5 h-full relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          
          <div className="flex items-center gap-2 mb-6">
            <Sun size={18} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white/80">Solar Tracker</h3>
            <div className="ml-auto text-xs text-white/50 px-2 py-1 rounded bg-white/5">
              Daylight: {Math.floor(totalDaylight / 60)}h {totalDaylight % 60}m
            </div>
          </div>

          <div className="relative h-24 mt-4 w-full">
            {/* The Arc */}
            <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none" className="overflow-visible">
              <path
                d="M 10 90 Q 100 -20 190 90"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 10 90 Q 100 -20 190 90"
                fill="none"
                stroke="url(#sunGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset={300 - (300 * dayPercentage) / 100}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Base Line */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10" />

            {/* Labels */}
            <div className="absolute bottom-[-20px] left-0 flex items-center gap-1 text-[10px] text-white/50">
              <Sunrise size={12} className="text-amber-500" />
              <span>{ast.sunrise}</span>
            </div>
            <div className="absolute bottom-[-20px] right-0 flex items-center gap-1 text-[10px] text-white/50">
              <span>{ast.sunset}</span>
              <Sunset size={12} className="text-orange-500" />
            </div>
            
            {/* Current Time Indicator - Absolute Center */}
            {dayPercentage > 0 && dayPercentage < 100 && (
              <div 
                className="absolute text-center" 
                style={{ 
                  left: `calc(${dayPercentage}% - 20px)`,
                  bottom: `calc(${Math.sin((dayPercentage / 100) * Math.PI) * 100}px - 10px)`
                }}
              >
                <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] border border-white" />
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Moon Phase & Astrophysics */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-5 h-full relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="flex items-center gap-2 mb-4">
            <MoonIcon size={18} className="text-indigo-300" />
            <h3 className="text-sm font-semibold text-white/80">Lunar Phase</h3>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex flex-col">
              <span className="text-white/40 text-xs uppercase tracking-wider mb-1">Current Phase</span>
              <span className="text-2xl font-light text-white">{phaseLabel}</span>
              
              <div className="flex items-center gap-4 mt-6">
                <div>
                  <p className="text-[10px] text-white/40 mb-1">Moonrise</p>
                  <p className="text-sm text-white/80">{ast.moonrise || "--:--"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 mb-1">Moonset</p>
                  <p className="text-sm text-white/80">{ast.moonset || "--:--"}</p>
                </div>
              </div>
            </div>

            <div className="relative w-24 h-24 rounded-full bg-[#0a0f1e] shadow-inner border border-white/5 overflow-hidden flex items-center justify-center">
              {/* Moon Visualizer - Approximating phase via shadow overlay */}
              <div className="absolute inset-0 bg-slate-200" />
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-400 to-transparent" />
              <div 
                className="absolute inset-0 bg-black/80 transition-all duration-1000"
                style={{
                  transform: `translateX(${100 - ast.moonIllumination}%)`,
                  borderRadius: ast.moonIllumination > 50 ? '0' : '50%'
                }}
              />
              <div className="absolute inset-x-0 bottom-2 text-center z-10">
                <span className="text-[10px] font-bold text-sky-400 drop-shadow-md">{ast.moonIllumination}%</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
