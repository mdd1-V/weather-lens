import { TooltipProvider } from "@/components/ui/tooltip";
import { useWeatherData } from "@/hooks/useWeatherData";
import { AppLayout } from "@/components/layout/AppLayout";
import { WeatherScene } from "@/components/weather/WeatherScene";
import { CurrentWeatherDisplay } from "@/components/weather/CurrentWeather";
import { HourlyForecastStrip } from "@/components/weather/HourlyForecast";
import { DailyForecastList } from "@/components/weather/DailyForecast";
import { WeatherDetailsGrid } from "@/components/weather/WeatherDetails";
import { SourceComparison } from "@/components/comparison/SourceComparison";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { RadarMap } from "@/components/map/RadarMap";
import { ClimateTimeMachine } from "@/components/analytics/ClimateTimeMachine";
import { AstrophysicsDashboard } from "@/components/analytics/AstrophysicsDashboard";
import { motion } from "framer-motion";
import { Cloud, Loader2 } from "lucide-react";
import { useEffect } from "react";

function App() {
  const { consensus, location, radar, loading, error, refresh, setLocation } =
    useWeatherData();

  useEffect(() => {
    if (consensus) {
      const timeOfDay = consensus.current.isDay ? 'day' : 'night';
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = `/icons/${consensus.current.condition}-${timeOfDay}.svg`;
      }
    }
  }, [consensus?.current.condition, consensus?.current.isDay]);

  // Loading screen
  if (loading && !consensus) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Cloud size={48} className="text-sky-400" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <h2 className="text-lg font-light text-white/80">WeatherLens</h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-white/40">
            <Loader2 size={14} className="animate-spin" />
            <span>Fetching from multiple sources...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error screen
  if (error && !consensus) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4 p-8">
        <Cloud size={48} className="text-red-400" />
        <h2 className="text-lg font-light text-white/80">Unable to load weather data</h2>
        <p className="text-sm text-white/40 text-center max-w-md">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-6 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!consensus) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <AppLayout
        onLocationSelect={setLocation}
        locationName={location?.name || "Loading..."}
        condition={consensus.current.condition}
        isDay={consensus.current.isDay}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative min-h-screen pb-12"
        >
          {/* Animated Weather Background */}
          <WeatherScene
            condition={consensus.current.condition}
            isDay={consensus.current.isDay}
          />

          {/* Content overlay */}
          <div className="relative z-10 max-w-2xl mx-auto pt-2 md:pt-6 pb-24">
            <CurrentWeatherDisplay
              consensus={consensus}
              onRefresh={refresh}
            />
            
            <div className="mt-2">
              <HourlyForecastStrip hourly={consensus.hourly} />
            </div>

            <div className="mt-4">
              <DailyForecastList daily={consensus.daily} />
            </div>

            <div className="mt-4">
              <WeatherDetailsGrid consensus={consensus} />
            </div>
            
            <div className="mt-8 px-4">
              <h2 className="text-xl font-light text-white/90 mb-4 px-1">Live Radar</h2>
              <RadarMap
                coordinates={consensus.location.coordinates}
                radar={radar}
              />
            </div>

            <div className="mt-8 px-4">
              <h2 className="text-xl font-light text-white/90 mb-4 px-1">Weather Intelligence</h2>
              <AnalyticsDashboard consensus={consensus} />
              
              {consensus.astronomy && (
                <div className="mt-4">
                  <AstrophysicsDashboard consensus={consensus} />
                </div>
              )}

              <div className="mt-4">
                <ClimateTimeMachine consensus={consensus} />
              </div>
            </div>

            <div className="mt-8 mb-8">
              <SourceComparison consensus={consensus} />
            </div>
          </div>
        </motion.div>
      </AppLayout>
    </TooltipProvider>
  );
}

export default App;
