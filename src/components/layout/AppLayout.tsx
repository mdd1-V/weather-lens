import { useState, useRef, useEffect } from "react";
import type { AppTab } from "@/types/weather";
import type { LocationInfo } from "@/types/weather";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchCities } from "@/services/geolocation";
import { Cloud, BarChart3, Map, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AppLayoutProps {
  onLocationSelect: (loc: LocationInfo) => void;
  locationName: string;
  children: React.ReactNode;
}

export function AppLayout({
  onLocationSelect,
  locationName,
  children,
}: AppLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchCities(query);
      setSearchResults(results);
      setSearching(false);
    }, 300);
  };

  const selectCity = (loc: LocationInfo) => {
    onLocationSelect(loc);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Header */}
      <header className="relative z-50 backdrop-blur-xl bg-black/20 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={18} className="text-sky-400" />
            <h1 className="text-sm font-semibold text-white/90 tracking-tight">
              WeatherLens
            </h1>
          </div>

          {/* Location / Search */}
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, width: 100 }}
                animate={{ opacity: 1, width: 200 }}
                exit={{ opacity: 0, width: 100 }}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search city..."
                    className="w-44 md:w-56 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5
                      text-xs text-white placeholder-white/30 outline-none focus:border-sky-400/50
                      transition-colors"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-lg">
                      {searchResults.map((loc, i) => (
                        <button
                          key={i}
                          onClick={() => selectCity(loc)}
                          className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                        >
                          <span className="font-medium">{loc.name}</span>
                          <span className="text-white/40">
                            {loc.region ? `, ${loc.region}` : ""}, {loc.country}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searching && (
                    <div className="absolute top-full mt-1 w-full bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg p-3">
                      <p className="text-xs text-white/40 text-center">Searching...</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="location"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                <span>{locationName}</span>
                <Search size={12} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 relative z-10 pb-12">{children}</main>
    </div>
  );
}
