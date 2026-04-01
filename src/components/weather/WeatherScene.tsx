import { useMemo } from "react";
import type { WeatherCondition } from "@/types/weather";

interface WeatherSceneProps {
  condition: WeatherCondition;
  isDay: boolean;
}

export function WeatherScene({ condition, isDay }: WeatherSceneProps) {
  const rainDrops = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 0.5 + Math.random() * 0.5,
        opacity: 0.3 + Math.random() * 0.7,
      })),
    []
  );

  const snowFlakes = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        size: 2 + Math.random() * 6,
        drift: -20 + Math.random() * 40,
      })),
    []
  );

  const clouds = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        top: 5 + Math.random() * 30,
        scale: 0.6 + Math.random() * 0.8,
        duration: 30 + Math.random() * 40,
        delay: -(Math.random() * 30),
        opacity: 0.3 + Math.random() * 0.4,
      })),
    []
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 60,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 2,
      })),
    []
  );

  // Background gradient based on condition + time of day
  const bgGradient = useMemo(() => {
    if (!isDay) {
      if (condition === "clear") return "linear-gradient(180deg, #0a0e27 0%, #1a1a3e 40%, #2d1b4e 100%)";
      if (condition === "rain" || condition === "heavy-rain") return "linear-gradient(180deg, #0a0a1a 0%, #1a1a2a 50%, #252535 100%)";
      return "linear-gradient(180deg, #0c1022 0%, #1a1a35 50%, #252540 100%)";
    }
    switch (condition) {
      case "clear": return "linear-gradient(180deg, #1e6fc2 0%, #3a9bd5 30%, #87ceeb 70%, #c4e4f7 100%)";
      case "partly-cloudy": return "linear-gradient(180deg, #2e6da0 0%, #5a9ec4 40%, #9ac5de 80%, #d0e6f0 100%)";
      case "cloudy":
      case "overcast": return "linear-gradient(180deg, #6b7b8d 0%, #8a9aab 40%, #aab5c0 80%, #c5cdd5 100%)";
      case "fog": return "linear-gradient(180deg, #8a9aab 0%, #b0bcc5 40%, #cdd5dc 80%, #e0e5ea 100%)";
      case "rain":
      case "drizzle": return "linear-gradient(180deg, #3a4a5a 0%, #556a7a 40%, #7a8f9f 80%, #9aabb8 100%)";
      case "heavy-rain": return "linear-gradient(180deg, #2a3540 0%, #3d4d5d 40%, #5a6d7d 80%, #7a8d9d 100%)";
      case "thunderstorm": return "linear-gradient(180deg, #1a1d2e 0%, #2a3040 50%, #3a4050 100%)";
      case "snow":
      case "heavy-snow": return "linear-gradient(180deg, #7a8a9a 0%, #a0b0c0 40%, #c5d0da 80%, #e0e8ef 100%)";
      case "sleet": return "linear-gradient(180deg, #5a6a7a 0%, #7a8a9a 40%, #9aabb8 100%)";
      default: return "linear-gradient(180deg, #1e6fc2 0%, #87ceeb 60%, #c4e4f7 100%)";
    }
  }, [condition, isDay]);

  const showRain = ["rain", "heavy-rain", "drizzle", "thunderstorm"].includes(condition);
  const showSnow = ["snow", "heavy-snow", "sleet"].includes(condition);
  const showClouds = !["clear"].includes(condition);
  const showSun = isDay && ["clear", "partly-cloudy"].includes(condition);
  const showLightning = condition === "thunderstorm";
  const showStars = !isDay && ["clear", "partly-cloudy"].includes(condition);
  const showFog = condition === "fog";

  return (
    <div
      className="fixed inset-0 overflow-hidden transition-all duration-[2000ms] pointer-events-none"
      style={{ background: bgGradient }}
    >
      {/* Stars */}
      {showStars &&
        stars.map((star) => (
          <div
            key={`star-${star.id}`}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}

      {/* Sun */}
      {showSun && (
        <div className="absolute top-[8%] right-[15%] w-24 h-24 md:w-32 md:h-32">
          <div className="absolute inset-0 rounded-full bg-yellow-300 animate-pulse-slow shadow-[0_0_60px_20px_rgba(255,220,100,0.4)]" />
          <div className="absolute -inset-4 rounded-full bg-yellow-200/20 animate-spin-very-slow" />
          {/* Sun rays */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 h-0.5 bg-gradient-to-r from-yellow-300/60 to-transparent animate-pulse-slow"
              style={{
                width: "60px",
                transformOrigin: "0 0",
                transform: `rotate(${i * 45}deg)`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Moon */}
      {!isDay && (
        <div className="absolute top-[8%] right-[15%] w-16 h-16 md:w-20 md:h-20">
          <div className="absolute inset-0 rounded-full bg-gray-200 shadow-[0_0_30px_10px_rgba(200,200,230,0.2)]" />
          <div className="absolute top-2 left-3 w-4 h-4 rounded-full bg-gray-300/50" />
          <div className="absolute top-6 left-6 w-2 h-2 rounded-full bg-gray-300/40" />
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gray-300/30" />
        </div>
      )}

      {/* Clouds */}
      {showClouds &&
        clouds.map((cloud) => (
          <div
            key={`cloud-${cloud.id}`}
            className="absolute animate-cloud-drift"
            style={{
              top: `${cloud.top}%`,
              transform: `scale(${cloud.scale})`,
              animationDuration: `${cloud.duration}s`,
              animationDelay: `${cloud.delay}s`,
              opacity: cloud.opacity,
            }}
          >
            <div className="relative">
              <div className="w-32 h-12 bg-white/80 rounded-full blur-[2px]" />
              <div className="absolute -top-4 left-6 w-20 h-16 bg-white/80 rounded-full blur-[2px]" />
              <div className="absolute -top-2 left-16 w-24 h-14 bg-white/70 rounded-full blur-[2px]" />
              <div className="absolute -top-6 left-12 w-16 h-14 bg-white/90 rounded-full blur-[1px]" />
            </div>
          </div>
        ))}

      {/* Rain */}
      {showRain &&
        rainDrops.map((drop) => (
          <div
            key={`rain-${drop.id}`}
            className="absolute animate-rain"
            style={{
              left: `${drop.left}%`,
              top: "-5%",
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
              opacity: drop.opacity,
            }}
          >
            <div
              className="w-0.5 rounded-full"
              style={{
                height: condition === "heavy-rain" ? "20px" : "12px",
                background: "linear-gradient(180deg, transparent, rgba(174,194,224,0.6), rgba(174,194,224,0.9))",
              }}
            />
          </div>
        ))}

      {/* Snow */}
      {showSnow &&
        snowFlakes.map((flake) => (
          <div
            key={`snow-${flake.id}`}
            className="absolute animate-snow"
            style={{
              left: `${flake.left}%`,
              top: "-5%",
              animationDelay: `${flake.delay}s`,
              animationDuration: `${flake.duration}s`,
              ["--snow-drift" as string]: `${flake.drift}px`,
            }}
          >
            <div
              className="rounded-full bg-white/90 blur-[0.5px]"
              style={{
                width: flake.size,
                height: flake.size,
              }}
            />
          </div>
        ))}

      {/* Lightning */}
      {showLightning && (
        <div className="absolute inset-0 animate-lightning bg-white/0 pointer-events-none" />
      )}

      {/* Fog */}
      {showFog && (
        <>
          <div className="absolute inset-0 animate-fog-drift-1">
            <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="absolute inset-0 animate-fog-drift-2">
            <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </>
      )}

      {/* Bottom gradient fade for readability */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
