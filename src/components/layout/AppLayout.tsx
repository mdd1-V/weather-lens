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
  condition?: string;
  isDay?: boolean;
  children: React.ReactNode;
}

export function AppLayout({
  onLocationSelect,
  locationName,
  condition,
  isDay = true,
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
            {condition ? (
              <img src={`/icons/${condition}-${isDay ? 'day' : 'night'}.svg`} alt="WeatherLens" className="w-6 h-6 object-contain drop-shadow-lg" />
            ) : (
              <Cloud size={18} className="text-sky-400" />
            )}
            <h1 className="text-sm font-semibold text-white/90 tracking-tight">
              WeatherLens
            </h1>
            <a href="https://github.com/mdd1-V/weather-lens" target="_blank" rel="noopener noreferrer" className="ml-2 text-white/40 hover:text-white transition-colors" title="View Source on GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
                <path d="M9 18c-4.5 1.5-5-2.5-7-3"></path>
              </svg>
            </a>
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
