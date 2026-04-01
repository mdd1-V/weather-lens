import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ConsensusResult } from "@/types/weather";
import { useHistoricalWeather, type HistoricalYearData } from "@/hooks/useHistoricalWeather";

interface ClimateTimeMachineProps {
  consensus: ConsensusResult;
}

export function ClimateTimeMachine({ consensus }: ClimateTimeMachineProps) {
  const { historicalData, loading, error } = useHistoricalWeather(consensus.location);

  // Today's consensus forecast for comparison
  const todayBestDaily = consensus.daily[0];
  const todayMaxTemp = todayBestDaily?.tempMax ?? consensus.current.temperature.value;

  if (error) {
    return (
      <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2 text-red-400">
          <History size={16} />
          <h3 className="text-sm font-semibold">Climate Time Machine</h3>
        </div>
        <p className="text-xs text-white/40">Failed to load historical climate data.</p>
      </Card>
    );
  }

  // Loading skeleton
  if (loading || !historicalData) {
    return (
      <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-pink-400" />
          <h3 className="text-sm font-semibold text-white/80">Climate Time Machine</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  const renderYearCard = (data: HistoricalYearData | null, label: string) => {
    if (!data) {
      return (
        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col justify-center items-center h-full">
          <p className="text-xs text-white/50">{label}</p>
          <p className="text-[10px] text-white/30 mt-2">Data strictly unavailable</p>
        </div>
      );
    }

    const deltaTemp = todayMaxTemp - data.tempMax;
    const isHotter = deltaTemp > 0;
    const isColder = deltaTemp < 0;
    const isSame = Math.abs(deltaTemp) < 0.5;

    let DeltaIcon = Minus;
    let deltaColor = "text-white/40";
    
    if (isHotter && !isSame) {
      DeltaIcon = TrendingUp;
      deltaColor = "text-red-400";
    } else if (isColder && !isSame) {
      DeltaIcon = TrendingDown;
      deltaColor = "text-blue-400";
    }

    return (
      <div className="text-center p-3 rounded-lg bg-white/5 border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="text-[10px] text-white/40 mb-1">{data.year}</p>
        <p className="text-xs font-medium text-white/80 mb-2">{label}</p>
        
        <div className="flex flex-col items-center">
          <p className="text-xl font-light text-white">
            {Math.round(data.tempMax)}°
          </p>
          <div className="flex items-center gap-1 mt-1">
            <DeltaIcon size={10} className={deltaColor} />
            <span className={`text-[10px] ${deltaColor}`}>
              {isSame ? "0°" : `${Math.abs(deltaTemp).toFixed(1)}°`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="backdrop-blur-xl bg-white/5 border-white/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-pink-400" />
            <h3 className="text-sm font-semibold text-white/80">Climate Time Machine</h3>
          </div>
          <span className="text-[10px] text-white/30 tracking-wider uppercase">Highs vs Today ({Math.round(todayMaxTemp)}°)</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {renderYearCard(historicalData.oneYear, "1 Year Ago")}
          {renderYearCard(historicalData.fiveYears, "5 Years Ago")}
          {renderYearCard(historicalData.tenYears, "10 Years Ago")}
        </div>
      </Card>
    </motion.div>
  );
}
