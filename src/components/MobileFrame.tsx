import { ReactNode, useState, useEffect } from "react";
import { Wifi, Battery, Signal, Moon, Sun } from "lucide-react";
import { Theme } from "../types";

interface MobileFrameProps {
  children: ReactNode;
  theme: Theme;
  toggleTheme: () => void;
}

export default function MobileFrame({ children, theme, toggleTheme }: MobileFrameProps) {
  const [timeState, setTimeState] = useState("");

  useEffect(() => {
    // Show clock matching modern digital phone
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, "0");
      let minutes = now.getMinutes().toString().padStart(2, "0");
      setTimeState(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`h-screen h-[100dvh] w-full flex flex-col items-center justify-center p-0 md:p-6 bg-[#030408] text-gray-100 font-sans leading-relaxed overflow-hidden`}>
      
      {/* Background Decorative Ambient Blobs - styled cleanly, not distracting */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translated-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Emulator Device Frame Wrapper (applied only on tablet/desktop displays) */}
      <div 
        id="android-frame"
        className={`relative w-full max-w-[420px] h-full max-h-screen md:h-[840px] md:max-h-[840px] md:rounded-[48px] md:border-[10px] md:border-[#1E2235] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-[#070913] md:shadow-indigo-900/10" 
            : "bg-slate-50 md:shadow-slate-300"
        }`}
      >
        {/* Android Punch Hole Notch & Glare on top (desktop only) */}
        <div 
          id="android-notch"
          className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 w-32 h-[22px] bg-black rounded-full z-50 flex items-center justify-center"
        >
          <div className="w-3 h-3 bg-gray-900 rounded-full border-2 border-slate-800 flex items-center justify-center">
            <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
          </div>
          <div className="ml-2 w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
        </div>

        {/* Dynamic Android Status Bar */}
        <div 
          id="android-status-bar"
          className={`w-full px-6 pt-3 pb-2.5 flex items-center justify-between text-xs z-40 transition-colors ${
            theme === "dark" ? "bg-[#070913]/90 text-gray-400" : "bg-slate-50/90 text-gray-500"
          }`}
        >
          <div className="font-semibold">{timeState || "12:00"}</div>
          
          <div className="flex items-center gap-2">
            {/* Quick Theme Switch inside status bar */}
            <button 
              id="theme-toggler-sb"
              onClick={toggleTheme} 
              className="p-1 hover:bg-white/10 rounded-full mr-2 transition-all"
              title={theme === "dark" ? "Açık Tema" : "Koyu Tema"}
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              )}
            </button>
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-medium scale-90">100%</span>
              <Battery className="w-4 h-4 text-emerald-500 fill-emerald-500/30" />
            </div>
          </div>
        </div>

        {/* Main Content Pane (Scrollable Area mimicking native Android screen) */}
        <div id="screen-content" className="flex-1 w-full flex flex-col overflow-hidden relative z-10">
          {children}
        </div>

        {/* Android Native Home Bar Pill Indicator (on bottom) */}
        <div 
          id="android-home-pill"
          className={`w-full py-2 flex justify-center items-center z-40 ${
            theme === "dark" ? "bg-[#070913]/90" : "bg-slate-50/90"
          }`}
        >
          <div className="w-32 h-[4px] rounded-full bg-gray-500/40"></div>
        </div>

      </div>

      {/* App Credit & Quick Access info below frame */}
      <div className="hidden md:flex mt-4 text-[11px] text-gray-500 items-center gap-2 font-mono">
        <span>Sokrates PDF Engine @ v1.0.0</span>
        <span>•</span>
        <span className="text-emerald-500/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          Çevrimiçi (Online)
        </span>
      </div>
    </div>
  );
}
