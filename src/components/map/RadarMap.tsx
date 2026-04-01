import { useEffect, useRef, useState, useCallback } from "react";
import type { Coordinates, RadarData } from "@/types/weather";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

// Dynamically import Leaflet CSS
import "leaflet/dist/leaflet.css";

interface RadarMapProps {
  coordinates: Coordinates;
  radar: RadarData | null;
}

export function RadarMap({ coordinates, radar }: RadarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.TileLayer[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allFrames = radar ? [...radar.past, ...radar.nowcast] : [];

  // Initialize map and preload all tiles
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [coordinates.latitude, coordinates.longitude],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark theme base tiles
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // Location marker
      const markerIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:14px;height:14px;background:#38bdf8;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(56,189,248,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([coordinates.latitude, coordinates.longitude], {
        icon: markerIcon,
      }).addTo(map);

      mapRef.current = map;

      // Preload all radar frames natively into the DOM so they cache and animate smoothly
      if (radar && allFrames.length > 0) {
        layersRef.current = allFrames.map((frame, idx) => {
          // Color scheme '2' (standard radar), smooth '1', snow '1'
          const tileUrl = `${radar.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
          const layer = L.tileLayer(tileUrl, {
            opacity: idx === allFrames.length - 1 ? 0.65 : 0, 
            maxZoom: 19,
            zIndex: 10 + idx,
          });
          layer.addTo(map);
          return layer;
        });

        setCurrentFrame(allFrames.length - 1);
      }

      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current = [];
      }
    };
  }, [coordinates.latitude, coordinates.longitude, radar]); // Re-init purely if location or radar host changes

  // Update radar playback frame smoothly by toggling DOM opacity
  const updateRadarFrame = useCallback(
    (frameIndex: number) => {
      if (!mapRef.current || layersRef.current.length === 0) return;

      layersRef.current.forEach((layer, idx) => {
        layer.setOpacity(idx === frameIndex ? 0.65 : 0);
      });
    },
    []
  );

  // Synchronize external frame jumps
  useEffect(() => {
    updateRadarFrame(currentFrame);
  }, [currentFrame, updateRadarFrame]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && allFrames.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          const next = (prev + 1) % allFrames.length;
          updateRadarFrame(next);
          return next;
        });
      }, 800);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, allFrames.length, updateRadarFrame]);

  const goToFrame = (idx: number) => {
    setCurrentFrame(idx);
    updateRadarFrame(idx);
  };

  const formatFrameTime = (time: number) => {
    return new Date(time * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="backdrop-blur-xl bg-white/5 border-white/10 overflow-hidden">
          {/* Map container */}
          <div
            ref={mapContainerRef}
            className="w-full h-[50vh] md:h-[60vh]"
            style={{ background: "#0a0f1e" }}
          />

          {/* Playback controls */}
          {allFrames.length > 0 && (
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => goToFrame(Math.max(0, currentFrame - 1))}
                >
                  <SkipBack size={14} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() =>
                    goToFrame(Math.min(allFrames.length - 1, currentFrame + 1))
                  }
                >
                  <SkipForward size={14} />
                </Button>

                {/* Scrubber */}
                <div className="flex-1 mx-2">
                  <input
                    type="range"
                    min={0}
                    max={allFrames.length - 1}
                    value={currentFrame}
                    onChange={(e) => goToFrame(parseInt(e.target.value))}
                    className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>

                {/* Timestamp */}
                <span className="text-xs text-white/50 w-12 text-right tabular-nums">
                  {allFrames[currentFrame]
                    ? formatFrameTime(allFrames[currentFrame].time)
                    : "--:--"}
                </span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-1 mt-2">
                <div className="flex items-center">
                  <div className="h-2 w-16 rounded-sm" style={{
                    background: "linear-gradient(90deg, #00ff00, #ffff00, #ff8800, #ff0000, #ff00ff)"
                  }} />
                </div>
                <span className="text-[9px] text-white/30 ml-1">Light → Heavy</span>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
