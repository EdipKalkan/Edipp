import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  ChevronRight, 
  Check, 
  AlertCircle,
  Hash,
  PenTool,
  Plus,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  BookMarked,
  Sparkles,
  Compass,
  Trophy,
  Activity
} from "lucide-react";
import { db } from "../services/databaseService";
import { DB_Subject, DB_Topic, DB_StudySession } from "../types";

// Dynamic YKS Student Motivational Focus Quotes
const TURKISH_MOTIVATION_QUOTES = [
  "Muvaffaqiyet gayrete aşıktır. Çalıştığın her saniye seni hedefine yakınlaştırıyor! 🎯",
  "Söküp atamayacağın hiçbir engel yoktur. Bugün atacağın küçük bir adım, yarının büyük zaferidir. 🚀",
  "Yorulmak bir mola sebebidir, vazgeçmek değil. Derin bir nefes al ve devam et! ☕",
  "ÖSYM zor sorar ama sağlam çalışan her zaman hakkını alır. Sen o hakkı almaya geldin! ⚔️",
  "Bütün büyük işler, başlangıçta imkansız gibi görünen küçük şeylerden ibarettir. 📜",
  "Ufka kilitlenen kaşifler fırtınalara aldırmaz. Senin ufkun üniversite kapısı! 🧭",
  "Çalışmak, gelecekteki özgürlüğünün en kutsal anahtarıdır. Odaklan ve başar! 🔑"
];

interface FocusTimerScreenProps {
  onSuccess: () => void;
  isDarkMode: boolean;
  preselectedSubjectId?: string;
  preselectedTopicId?: string;
}

export default function FocusTimerScreen({ onSuccess, isDarkMode, preselectedSubjectId, preselectedTopicId }: FocusTimerScreenProps) {
  const [subjects, setSubjects] = useState<DB_Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [topics, setTopics] = useState<DB_Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  
  // New Pomodoro Focus & Break Customization variables
  const [timerType, setTimerType] = useState<"focus" | "break">("focus");
  const [focusGoalMinutes, setFocusGoalMinutes] = useState<number>(25);
  const [breakGoalMinutes, setBreakGoalMinutes] = useState<number>(5);

  // Real-time goal targets
  const [timerGoalMinutes, setTimerGoalMinutes] = useState<number>(25); // 25, 40, 60 or Free mode
  const [isFreeMode, setIsFreeMode] = useState<boolean>(false);

  // Full Screen Focus State
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isBreakOvertimeWarningActive, setIsBreakOvertimeWarningActive] = useState<boolean>(false);

  const handleEnterFullscreen = async () => {
    setIsFullscreenMode(true);
    document.documentElement.classList.add("focus-timer-fullscreen");
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Browser full screen request failed:", e);
    }
  };

  const handleExitFullscreen = async () => {
    setIsFullscreenMode(false);
    document.documentElement.classList.remove("focus-timer-fullscreen");
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Browser full screen exit failed:", e);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = !!document.fullscreenElement;
      setIsFullscreenMode(isNative);
      if (isNative) {
        document.documentElement.classList.add("focus-timer-fullscreen");
      } else {
        document.documentElement.classList.remove("focus-timer-fullscreen");
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.documentElement.classList.remove("focus-timer-fullscreen");
    };
  }, []);

  // Sound Synthesizer States
  const [activeAmbientSound, setActiveAmbientSound] = useState<"none" | "rain" | "waves" | "forest">("none");

  // Rotating quote index
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Easy Create Subject & Topic Modals
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [newSubjectExam, setNewSubjectExam] = useState<string>("TYT-AYT");
  const [newSubjectColor, setNewSubjectColor] = useState<string>("indigo");

  const [showTopicModal, setShowTopicModal] = useState<boolean>(false);
  const [newTopicName, setNewTopicName] = useState<string>("");
  const [newTopicDesc, setNewTopicDesc] = useState<string>("");

  // High reliability epoch-alignment refs
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<any>(null);

  // Web Audio Synth references (prevent garbage collection & memory leaks)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<any[]>([]);

  // Session Note Input State
  const [showNoteDialog, setShowNoteDialog] = useState<boolean>(false);
  const [sessionNote, setSessionNote] = useState<string>("");

  // Periodically rotate the premium motivational YKS quote
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % TURKISH_MOTIVATION_QUOTES.length);
    }, 18000);
    return () => clearInterval(quoteInterval);
  }, []);

  // Sync data initially or from props change
  const refreshData = () => {
    const list = db.getSubjects();
    setSubjects(list);
    
    if (preselectedSubjectId) {
      setSelectedSubjectId(preselectedSubjectId);
    } else if (list.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(list[0].id);
    }
  };

  useEffect(() => {
    refreshData();
  }, [preselectedSubjectId]);

  useEffect(() => {
    if (selectedSubjectId) {
      const list = db.getTopics(selectedSubjectId);
      setTopics(list);
      
      if (preselectedTopicId && list.some(t => t.id === preselectedTopicId)) {
        setSelectedTopicId(preselectedTopicId);
      } else if (list.length > 0) {
        setSelectedTopicId(list[0].id);
      } else {
        setSelectedTopicId("");
      }
    } else {
      setTopics([]);
      setSelectedTopicId("");
    }
  }, [selectedSubjectId, preselectedTopicId]);

  // Handle ticking with exact time stamps to resist background app sleep!
  const handleToggleTimer = () => {
    // Only require selecting a subject when starting a "focus" study session!
    if (timerType === "focus" && !selectedSubjectId) {
      alert("Lütfen önce çalışacağınız bir ders seçin veya yeni bir ders ekleyin!");
      return;
    }

    if (!isRunning) {
      // STARTing or RESUMING
      startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
      setIsRunning(true);

      // Trigger ambient audio automatically if specified!
      if (activeAmbientSound !== "none") {
        startSynthesizedAmbient(activeAmbientSound);
      }

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(currentElapsed);

          // If reached goal & not free mode: flash/chime notification
          const currentGoal = timerType === "focus" ? focusGoalMinutes : breakGoalMinutes;
          const targetSeconds = currentGoal * 60;
          if (!isFreeMode && currentElapsed >= targetSeconds) {
            if (timerType === "focus") {
              // Automatically transition to BREAK mode!
              // "40 dk ders 8 dk mola seçildiğinde otomatik molaya geçsin"
              playHighChime();
              setTimerType("break");
              setElapsedSeconds(0);
              startTimeRef.current = Date.now(); // reset start epoch for break timer to count up!
              setIsRunning(true);
              setIsBreakOvertimeWarningActive(false);
              stopSynthesizedAmbient(); // stop ambient study sounds if any
              alert(`Tebrikler! ${focusGoalMinutes} dakikalık odaklanma seansınızı başarıyla tamamladınız. ${breakGoalMinutes} dakikalık mola (dinlenme) seansınız otomatik olarak başladı! ☕`);
            } else {
              // Inside break mode, we completed our mola goal (8m goal reached)!
              // "kullanıcı 8 dk dolduğunda molayı bitir uyarısı gelsin eğer kullanıcı bitire basmazsa mola sayacı devam etsin"
              // Do NOT pause the timer, let elapsedSeconds tick upwards naturally.
              if (!isBreakOvertimeWarningActive) {
                playHighChime();
                setIsBreakOvertimeWarningActive(true);
              }
            }
          }
        }
      }, 1000);
    } else {
      // PAUSING
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsRunning(false);
      stopSynthesizedAmbient();
    }
  };

  const handleResetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    startTimeRef.current = null;
    setIsBreakOvertimeWarningActive(false);
    stopSynthesizedAmbient();
  };

  const handleFinishBreakOvertime = () => {
    setIsBreakOvertimeWarningActive(false);
    handleResetTimer();
    setTimerType("focus");
    alert("☕ Mola başarıyla tamamlandı, ders seansına geçiş yapıldı! İyi çalışmalar! 🔥");
  };

  const handleFinishPrompt = () => {
    if (timerType === "break") {
      if (confirm("Mola seansını kapatıp ders çalışma moduna geçmek istiyor musunuz?")) {
        handleResetTimer();
        setTimerType("focus");
      }
      return;
    }

    if (elapsedSeconds < 10) {
      alert("Çalışma seansı kaydı yapabilmek için en az 10 saniye odaklanmış olmalısınız.");
      return;
    }
    // Pause timer and open note typing dialog
    if (isRunning) {
      handleToggleTimer();
    }
    setShowNoteDialog(true);
  };

  const handleSaveSession = () => {
    const endedAtDate = new Date();
    const duration = elapsedSeconds;

    const startTimestamp = startTimeRef.current || (Date.now() - (elapsedSeconds * 1000));
    const startedTimeStr = new Date(startTimestamp).toISOString();

    const session: DB_StudySession = {
      id: "sess_" + Math.random().toString(36).substring(2, 11),
      subject_id: selectedSubjectId,
      topic_id: selectedTopicId || undefined,
      started_at: startedTimeStr,
      ended_at: endedAtDate.toISOString(),
      duration_seconds: duration,
      status: "completed",
      note: sessionNote.trim() || undefined,
      created_at: endedAtDate.toISOString(),
      updated_at: endedAtDate.toISOString()
    };

    db.addStudySession(session);
    
    // Cleanup
    handleResetTimer();
    setShowNoteDialog(false);
    setSessionNote("");
    stopSynthesizedAmbient();
    handleExitFullscreen();
    onSuccess(); // Triggers switching tabs back to home
    alert("Ders odaklanma seansınız başarıyla kaydedildi! Harika ilerleme.");
  };

  // Direct addition of new Subject (Matematik, Fizik, Türkçe...)
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const colors = ["indigo", "emerald", "amber", "rose", "cyan", "purple"];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    const subject: DB_Subject = {
      id: "sub_" + Math.random().toString(36).substring(2, 11),
      name: newSubjectName.trim(),
      exam_type: newSubjectExam,
      color: chosenColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.addSubject(subject);
    setNewSubjectName("");
    setShowSubjectModal(false);
    
    // Refresh & Auto-select
    const list = db.getSubjects();
    setSubjects(list);
    setSelectedSubjectId(subject.id);
  };

  // Direct addition of new Topic (Türev, Kuvvet, Divan Edebiyatı...)
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedSubjectId) return;

    const topic: DB_Topic = {
      id: "topic_" + Math.random().toString(36).substring(2, 11),
      subject_id: selectedSubjectId,
      name: newTopicName.trim(),
      description: newTopicDesc.trim() || "YKS Kazanım Başlığı",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.addTopic(topic);
    setNewTopicName("");
    setNewTopicDesc("");
    setShowTopicModal(false);

    // Refresh & Auto-select
    const list = db.getTopics(selectedSubjectId);
    setTopics(list);
    setSelectedTopicId(topic.id);
  };

  // ----------------------------------------------------
  // HIGH POLISHED OFFLINE WEB AUDIO SYNTHESIZER
  // ----------------------------------------------------
  const playHighChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // Beautiful C major cascade
      frequencies.forEach((f, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + index * 0.15);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + index * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + index * 0.15 + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + index * 0.15);
        osc.stop(audioCtx.currentTime + index * 0.15 + 0.7);
      });
    } catch(e) {}
  };

  const startSynthesizedAmbient = (sound: "rain" | "waves" | "forest") => {
    try {
      stopSynthesizedAmbient();

      // Initialize audio context lazily
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      // Ensure state is running (especially in Chrome/Safari)
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      if (sound === "rain") {
        // Brown noise simulation with bandpass filter
        const bufferSize = 10 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Gain amplification
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(450, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        whiteNoise.start();
        synthNodesRef.current.push(whiteNoise);
        synthNodesRef.current.push(gainNode);
      } 
      else if (sound === "waves") {
        // Binaural focus waves (low alpha wave oscillators pulsing)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const mainGain = audioCtx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(140, audioCtx.currentTime); // 130Hz
        
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(148, audioCtx.currentTime); // 138Hz (8Hz Alpha differential!)

        // Low volume modulator
        const pulseGain = audioCtx.createGain();
        pulseGain.gain.setValueAtTime(0.06, audioCtx.currentTime);

        osc1.connect(pulseGain);
        osc2.connect(pulseGain);
        pulseGain.connect(audioCtx.destination);

        osc1.start();
        osc2.start();

        synthNodesRef.current.push(osc1, osc2, pulseGain);
      } 
      else if (sound === "forest") {
        // Forest birds - Synthesize random high bell melodies on timers every 3.5 seconds
        const mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);

        const playTimer = setInterval(() => {
          if (!audioCtxRef.current || audioCtxRef.current.state === "closed") return;
          const osc = audioCtxRef.current.createOscillator();
          const pGain = audioCtxRef.current.createGain();
          
          const pitchList = [880, 987.77, 1046.50, 1174.66, 1318.51]; // pentatonic chimes
          const randomFreq = pitchList[Math.floor(Math.random() * pitchList.length)];
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(randomFreq, audioCtxRef.current.currentTime);
          pGain.gain.setValueAtTime(0.04, audioCtxRef.current.currentTime);
          pGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 1.2);
          
          osc.connect(pGain);
          pGain.connect(mainGain);
          
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 1.3);
        }, 4200);

        synthNodesRef.current.push({ stop: () => clearInterval(playTimer) });
      }
    } catch (e) {
      console.warn("Ambient synthesis error:", e);
    }
  };

  const stopSynthesizedAmbient = () => {
    try {
      synthNodesRef.current.forEach(node => {
        if (node && typeof node.stop === "function") {
          node.stop();
        }
      });
      synthNodesRef.current = [];
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {}
  };

  const formatDisplayTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Safe release on teardown
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSynthesizedAmbient();
    };
  }, []);

  // Sync ambient sound to runner
  useEffect(() => {
    if (isRunning && activeAmbientSound !== "none") {
      startSynthesizedAmbient(activeAmbientSound);
    } else {
      stopSynthesizedAmbient();
    }
  }, [activeAmbientSound]);

  // Current target details
  const activeSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  const activeTopic = useMemo(() => {
    return topics.find(t => t.id === selectedTopicId);
  }, [topics, selectedTopicId]);

  // Circular progress ring parameters
  const progressRatio = useMemo(() => {
    if (isFreeMode) return 0;
    const currentGoal = timerType === "focus" ? focusGoalMinutes : breakGoalMinutes;
    const targetSeconds = currentGoal * 60;
    return Math.min(1.0, elapsedSeconds / targetSeconds);
  }, [elapsedSeconds, focusGoalMinutes, breakGoalMinutes, isFreeMode, timerType]);

  const strokeDashoffset = progressRatio * 283; // Circumference matches standard r=45 (2 * pi * r = 282.7)

  return (
    <div className={`p-4 flex flex-col gap-4 flex-1 overflow-y-auto transition-colors ${
      isFullscreenMode 
        ? "fixed inset-0 bg-[#070913] text-white z-50 flex flex-col justify-between items-center p-6" 
        : isDarkMode ? "bg-transparent text-white" : "bg-transparent text-slate-900"
    }`}>

      {/* ========================================================
          A. FULL SCREEN WORKSPACE OVERLAY (DISTRACTION FREE!)
          ======================================================== */}
      {isFullscreenMode ? (
        <div className="w-full flex-1 flex flex-col justify-center items-center relative min-h-[85vh]">
          
          {/* Subtle close control (minimizer) in the corner */}
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={handleExitFullscreen}
              className="p-3 bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-gray-400 hover:text-white rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black"
              title="Mini Ekrana Dön"
            >
              <Minimize2 className="w-4 h-4 text-emerald-400" />
              <span>Odaktan Çık</span>
            </button>
          </div>

          {/* Break completion Overtime Banner (Center-Top block) */}
          {isBreakOvertimeWarningActive && (
            <div className="mb-6 bg-red-600 border border-red-500 text-white font-extrabold text-xs rounded-2xl p-4 text-center max-w-sm flex flex-col items-center gap-2.5 shadow-2xl shadow-red-955/20 animate-pulse z-25">
              <AlertCircle className="w-6 h-6 text-white" />
              <span>MOLANIZ DOLDU! DERSE GERİ DÖNÜN.</span>
              <p className="text-[10px] text-red-100 font-normal">Mola süresi tamamlandı. Sayaç sizi bekliyor.</p>
              <button
                onClick={handleFinishBreakOvertime}
                className="bg-white hover:bg-slate-100 text-slate-950 font-black rounded-xl px-4 py-2 text-[10px] shadow-lg transition-colors cursor-pointer"
              >
                Molayı Bitir, Çalışmaya Dön!
              </button>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="px-4 py-1.5 bg-indigo-950/45 border border-indigo-500/20 text-[11px] font-black uppercase tracking-widest text-[#f59e0b] rounded-full inline-block font-mono">
              {timerType === "focus" ? `🎯 ÇALIŞMA SEANSI • ${activeSubject?.name || "Ders"}` : "☕ MOLA SEANSI"}
            </div>
            {timerType === "focus" && activeTopic?.name && (
              <p className="text-xs text-slate-400 font-mono mt-2 italic">"{activeTopic.name}"</p>
            )}
          </div>

          {/* Dedicated Pomodoro Work/Break Controller */}
          <div className="flex bg-slate-900 border border-white/5 p-1 rounded-2xl w-full max-w-[240px] mb-6 shadow-lg z-20">
            <button
              type="button"
              onClick={() => {
                if (timerType !== "focus") {
                  handleResetTimer();
                  setTimerType("focus");
                }
              }}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                timerType === "focus"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🎯 ÇALIŞMA (WORK)
            </button>
            <button
              type="button"
              onClick={() => {
                if (timerType !== "break") {
                  handleResetTimer();
                  setTimerType("break");
                }
              }}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                timerType === "break"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ☕ MOLA (BREAK)
            </button>
          </div>

          {/* Central Massive Pure Stopwatch Chronometer */}
          <div className="my-auto relative flex items-center justify-center">
            
            {/* Spinning background stars */}
            <div className={`absolute w-80 h-80 rounded-full border border-teal-500/10 ${isRunning ? "animate-spin" : ""}`} style={{ animationDuration: "35s" }} />
            <div className={`absolute w-88 h-88 rounded-full border border-indigo-500/5 ${isRunning ? "animate-spin animate-pulse" : ""}`} style={{ animationDuration: "25s", animationDirection: "reverse" }} />

            {/* Glowing clock circle object - Only displaying the beautiful chronometer */}
            <div className="w-72 h-72 rounded-full bg-slate-950/85 border border-white/5 flex flex-col items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 hover:scale-105">
              
              <CircularTimerRing strokeDashoffset={strokeDashoffset} isRunning={isRunning} />

              <span className={`text-xs font-black uppercase tracking-widest font-mono mb-2 ${isRunning ? "animate-pulse" : ""}`} style={{ color: timerType === "focus" ? "#fbbf24" : "#10b981" }}>
                {isRunning ? (timerType === "focus" ? "ODAKLANILIYOR" : "ZİHNİNİ DİNLENDİR") : "DURAKLATILDI"}
              </span>

              <h1 className="text-5xl font-black tracking-wider text-white font-mono drop-shadow-lg select-none">
                {formatDisplayTime(elapsedSeconds)}
              </h1>

              <p className="text-xs font-mono text-gray-400 mt-2">
                {!isFreeMode 
                  ? `Limit: ${timerType === "focus" ? focusGoalMinutes : breakGoalMinutes} dk` 
                  : "Sonsuz Maraton"
                }
              </p>
            </div>
          </div>

          {/* Distraction free footer controls for toggling */}
          <div className="flex gap-4 items-center mt-12">
            <button
              onClick={handleToggleTimer}
              className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 shadow-lg ${
                isRunning 
                  ? "bg-amber-500 hover:bg-amber-450 text-slate-950 shadow-amber-500/10" 
                  : "bg-emerald-500 hover:bg-emerald-450 text-slate-950 shadow-emerald-500/10"
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? "DURAKLAT" : "BAŞLAT"}</span>
            </button>

            <button
              onClick={handleFinishPrompt}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-indigo-600/20 shadow-lg"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{timerType === "focus" ? "SEANSI BİTİR" : "MOLAYI BİTİR (FINISH)"}</span>
            </button>
          </div>

        </div>
      ) : (
        
        // ========================================================
        // B. STANDARD TAB VIEW: HIGH-QUALITY TURKISH STUDY BOARD
        // ========================================================
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
          
          {/* Header Dashboard panel */}
          <div className={`p-4 rounded-[24px] border flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 transition-colors ${
            isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-205/60 shadow-xs"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-bold tracking-widest uppercase text-indigo-400 block">
                  Sayaç Odaklanma Başbuğu
                </span>
                <h2 className={`text-base font-black ${isDarkMode ? "text-white" : "text-slate-950"}`}>
                  Ders Çalışma Seansı & Kronometre
                </h2>
              </div>
            </div>

            {/* Enter distraction free overlay */}
            <button
              onClick={() => {
                if (!selectedSubjectId) {
                  alert("Lütfen önce çalışacağınız bir ders seçin!");
                  return;
                }
                handleEnterFullscreen();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 self-start md:self-auto shadow-md transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" /> Tam Ekran Odaklan!
            </button>
          </div>

          {/* ========================================================
              ★ THE TIMER AREA PLACED AT THE VERY TOP OF THE WORKSPACE ★
              ======================================================== */}
          <div className={`p-5 rounded-[24px] border text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden ${
            isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-200 shadow-sm"
          }`}>
            
            {/* Visual pulsating background chimes */}
            {isRunning && (
              <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-3xl animate-pulse" />
            )}

            {/* Break Overflow Warning Banner (Inline Inside Top Clock) */}
            {isBreakOvertimeWarningActive && (
              <div className="absolute inset-x-0 top-0 bg-red-650 text-white py-3 px-4 font-bold text-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 animate-pulse z-40 rounded-t-2xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Mola Süreniz Tamamlandı! Lütfen Çalışmaya Geri Dönün.</span>
                <button
                  onClick={handleFinishBreakOvertime}
                  className="bg-white text-slate-950 font-black rounded-lg px-2.5 py-1 hover:bg-gray-150 transition-colors uppercase tracking-tight text-[10px] self-center shrink-0 cursor-pointer"
                >
                  Molayı Bitir, Derse Dön!
                </button>
              </div>
            )}

            <div className={`relative z-10 w-full flex flex-col items-center ${isBreakOvertimeWarningActive ? "pt-8" : ""}`}>
              
              {/* Course color badge indicators */}
              {timerType === "break" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl text-[10px] text-emerald-400 font-extrabold uppercase mb-1">
                  ☕ MOLA / DİNLENME SÜRESİ
                </div>
              ) : activeSubject ? (
                <div className="bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-xl text-[10px] text-indigo-400 font-extrabold uppercase mb-1">
                  📚 {activeSubject.name} • {activeSubject.exam_type}
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-xl text-[10px] text-red-400 font-extrabold uppercase mb-1">
                  DERS SEÇİLMEDİ
                </div>
              )}

              {timerType === "break" ? (
                <span className="text-[10px] text-gray-500 block mb-2">
                  Görev: Zihninizi Yenileyin 🧠
                </span>
              ) : activeTopic ? (
                <span className="text-[10px] text-gray-400 max-w-[200px] truncate block mb-2 font-semibold font-mono">
                  Görev: {activeTopic.name}
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 block mb-2 font-mono">
                  Konu: Genel Tekrar
                </span>
              )}

              {/* Dedicated Pomodoro Work/Break Controller */}
              <div className="flex bg-slate-950 border border-white/5 p-1 rounded-2xl w-full max-w-[240px] mb-4 shadow-lg z-25">
                <button
                  type="button"
                  onClick={() => {
                    if (timerType !== "focus") {
                      handleResetTimer();
                      setTimerType("focus");
                    }
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    timerType === "focus"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🎯 ÇALIŞMA (WORK)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (timerType !== "break") {
                      handleResetTimer();
                      setTimerType("break");
                    }
                  }}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    timerType === "break"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  ☕ MOLA (BREAK)
                </button>
              </div>

              {/* Pulsing visual clock circle */}
              <div className="relative flex items-center justify-center my-2">
                {/* Glowing outer progress ring */}
                <div className="w-52 h-52 rounded-full border border-white/5 flex flex-col items-center justify-center shadow-lg bg-slate-950 relative">
                   
                  <CircularTimerRing strokeDashoffset={strokeDashoffset} isRunning={isRunning} />

                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#f59e0b] font-black">
                    {timerType === "focus" ? "ODAKLAN" : "MOLA"}
                  </span>
                  
                  {isBreakOvertimeWarningActive && (
                    <span className="text-[8px] font-extrabold text-red-405 animate-bounce uppercase font-mono tracking-wider mt-0.5">
                      ⚠️ Mola Aşımı!
                    </span>
                  )}

                  <h2 className="text-3xl font-black text-white font-mono tracking-wide mt-1 select-all">
                    {formatDisplayTime(elapsedSeconds)}
                  </h2>

                  <span className="text-[8px] font-mono text-gray-400 mt-1">
                    {!isFreeMode 
                      ? `Hedef Sınırı: ${timerType === "focus" ? focusGoalMinutes : breakGoalMinutes} dk` 
                      : "Serbest Sayım"
                    }
                  </span>
                </div>
              </div>

              {/* Play controls */}
              <div className="flex gap-2 max-w-sm w-full mt-4">
                <button
                  onClick={handleToggleTimer}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1 text-slate-950 cursor-pointer ${
                    isRunning 
                      ? "bg-amber-500 hover:bg-amber-450 active:scale-95 shadow-md"
                      : "bg-emerald-500 hover:bg-emerald-450 active:scale-95 shadow-md"
                  }`}
                >
                  {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  {isRunning ? "Durdur" : "Başlat"}
                </button>

                <button
                  onClick={handleFinishPrompt}
                  className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-indigo-600/10 shadow-lg"
                >
                  {timerType === "focus" ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Bitir
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Mola Bitir (Finish)
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetTimer}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isDarkMode ? "bg-slate-950 border-white/5 text-gray-400 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                  }`}
                  title="Sıfırla"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

          {/* MOTIVATION BANNER */}
          <div className="p-3 px-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl text-[11px] leading-relaxed flex items-start gap-2.5">
            <span className="text-base">🚀</span>
            <div>
              <span className="font-bold text-teal-400 block">ÖSYM Savaşçısının Günlük Sözü:</span>
              <p className={isDarkMode ? "text-gray-300" : "text-slate-700"}>
                "{TURKISH_MOTIVATION_QUOTES[quoteIndex]}"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* LEFT CONFIGURATOR: Select Course, Select Topic, Quick Addition (7 columns) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* SELECT LESSON CARD */}
              <div className={`p-5 rounded-[24px] border flex flex-col gap-3.5 relative overflow-hidden ${
                isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                
                <div className="flex justify-between items-center border-b border-gray-800/20 pb-2">
                  <span className="text-[10.5px] font-black tracking-wider uppercase text-indigo-400 flex items-center gap-1">
                    <BookMarked className="w-4 h-4 text-indigo-400" /> 1. ÇALIŞACAĞINIZ DERSİ SEÇİN
                  </span>
                  
                  {/* Create New Lesson Trigger Button */}
                  <button
                    onClick={() => setShowSubjectModal(true)}
                    className="px-2.5 py-1 bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/30 font-black text-[10px] rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer border border-indigo-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Yeni Ders Ekle
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`p-3 rounded-xl text-left border flex flex-col justify-between h-20 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-md scale-102 font-bold"
                            : isDarkMode 
                            ? "bg-slate-950/60 border-white/5 text-gray-400 hover:bg-slate-900/60"
                            : "bg-slate-50 border-slate-205/60 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-[9px] font-black font-mono px-1.5 py-0.5 bg-black/20 text-indigo-350 self-start rounded mb-1 border border-white/5 lowercase uppercase">
                          {sub.exam_type}
                        </span>
                        <span className="text-xs font-black truncate max-w-full block">
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                  
                  {subjects.length === 0 && (
                    <div className="col-span-full text-center py-4 text-xs text-gray-500">
                      Hiç ders eklenmemiş. Lütfen "Ders Ekle" butonuyla yeni bir ders oluşturun!
                    </div>
                  )}
                </div>

                {/* SELECT TOPIC SUBSECTOR */}
                {selectedSubjectId ? (
                  <div className="mt-2.5 border-t border-slate-800/20 pt-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase text-indigo-450 tracking-wider">
                        Konu Seçimi (Ders Kazanımları)
                      </span>
                      <button
                        onClick={() => setShowTopicModal(true)}
                        className="text-[9.5px] font-bold text-amber-500 hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Yeni Konu/Başlık Ekle
                      </button>
                    </div>

                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:border-indigo-500 select-none ${
                        isDarkMode ? "bg-slate-950 border-white/5 text-white" : "bg-white border-slate-250 text-slate-800"
                      }`}
                    >
                      <option value="">-- Tüm Konuyu / Genel Tekrarı Kapsasın --</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>
                          📖 {t.name}
                        </option>
                      ))}
                    </select>

                    {topics.length === 0 && (
                      <p className="text-[10px] text-yellow-500">
                        ⚠ Bu derse ait hiç konu başlığı eklenmemiş. "Yeni Konu Ekle" diyerek hemen TYT/AYT modüllerini bağlayabilirsiniz!
                      </p>
                    )}
                  </div>
                ) : null}

              </div>

              {/* TIMING REGIMENT SELECTOR (Classic Pomodoro & Break Customization Dials) */}
              <div className={`p-5 rounded-[24px] border flex flex-col gap-3.5 ${
                isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10.5px] font-black tracking-wider uppercase text-indigo-400 flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-indigo-400" /> 2. POMODORO SÜRELERİNİ AYARLAYIN
                  </span>
                  
                  {/* Free Mode Toggle Badge */}
                  <button
                    onClick={() => setIsFreeMode(!isFreeMode)}
                    className={`px-2 py-1 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer ${
                      isFreeMode 
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/35" 
                        : "bg-slate-950/40 text-gray-400 border border-transparent"
                    }`}
                  >
                    {isFreeMode ? "♾ Serbest Kronometre" : "⏱ Süreli Hedef"}
                  </button>
                </div>

                {/* Session Mode Selector */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTimerType("focus");
                      handleResetTimer();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      timerType === "focus"
                        ? "bg-amber-500 border-amber-600 text-slate-950 font-black shadow-md"
                        : isDarkMode
                        ? "bg-slate-950/60 border-white/5 text-gray-400 hover:bg-slate-900"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-205"
                    }`}
                  >
                    <span>🎯 Ders Çalışma Seansı</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimerType("break");
                      handleResetTimer();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      timerType === "break"
                        ? "bg-emerald-500 border-emerald-600 text-slate-950 font-black shadow-md"
                        : isDarkMode
                        ? "bg-slate-950/60 border-white/5 text-gray-400 hover:bg-slate-900"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-205"
                    }`}
                  >
                    <span>☕ Mola / Dinlenme</span>
                  </button>
                </div>

                {/* Custom Setting Dials */}
                {!isFreeMode && (
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                    
                    {/* Focus Length Setting */}
                    <div className="flex flex-col gap-1 text-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Çalışma Süresi</span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(1, focusGoalMinutes - 5);
                            setFocusGoalMinutes(val);
                            if (timerType === "focus") handleResetTimer();
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 flex items-center justify-center cursor-pointer border border-white/5"
                        >
                          -
                        </button>
                        <span className="text-sm font-black font-mono text-white min-w-10">
                          {focusGoalMinutes} dk
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFocusGoalMinutes(focusGoalMinutes + 5);
                            if (timerType === "focus") handleResetTimer();
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 flex items-center justify-center cursor-pointer border border-white/5"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Break Length Setting */}
                    <div className="flex flex-col gap-1 text-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mola Süresi</span>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(1, breakGoalMinutes - 1);
                            setBreakGoalMinutes(val);
                            if (timerType === "break") handleResetTimer();
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 flex items-center justify-center cursor-pointer border border-white/5"
                        >
                          -
                        </button>
                        <span className="text-sm font-black font-mono text-white min-w-10">
                          {breakGoalMinutes} dk
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setBreakGoalMinutes(breakGoalMinutes + 1);
                            if (timerType === "break") handleResetTimer();
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 flex items-center justify-center cursor-pointer border border-white/5"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* Pomodoro Presets */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest block mb-0.5">Hızlı Pomodoro Ayar Şablonları:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { f: 25, b: 5, label: "🍅 Klasik", desc: "25dk / 5dk" },
                      { f: 40, b: 8, label: "✍ Prova", desc: "40dk / 8dk" },
                      { f: 50, b: 10, label: "🧠 Yoğun", desc: "50dk / 10dk" },
                    ].map((preset, idx) => {
                      const isPresetMatched = focusGoalMinutes === preset.f && breakGoalMinutes === preset.b && !isFreeMode;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFocusGoalMinutes(preset.f);
                            setBreakGoalMinutes(preset.b);
                            setIsFreeMode(false);
                            handleResetTimer();
                          }}
                          className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                            isPresetMatched
                              ? "bg-indigo-600 border-indigo-500 text-white font-black scale-102"
                              : isDarkMode
                              ? "bg-slate-950/80 border-white/5 text-gray-400 hover:bg-slate-900"
                              : "bg-slate-50 border-slate-205 text-slate-650 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-[10px] font-black block leading-none">{preset.label}</span>
                          <span className="text-[8px] text-slate-500 block truncate mt-0.5">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* STUDY AMBIENT SOUND GENERATOR */}
              <div className={`p-4 rounded-[24px] border flex flex-col gap-2 ${
                isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-204 shadow-xs"
              }`}>
                <span className="text-[9.5px] font-black uppercase tracking-wider text-teal-450 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-teal-400 animate-pulse" /> Relaxing Focus Fon Sesleri (Web Audio Synthesizer):
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: "none", label: "🔇 Sessiz" },
                    { key: "rain", label: "🌧️ Yağmur" },
                    { key: "waves", label: "🌊 Derin Dalga" },
                    { key: "forest", label: "🍃 Doğa Kuşları" }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setActiveAmbientSound(item.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        activeAmbientSound === item.key
                          ? "bg-teal-500 border-teal-600 text-slate-950 font-black shadow-md"
                          : "bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT MONITORING: Large visual countdown with orbit (5 columns) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              <div className={`p-5 rounded-[24px] border text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden ${
                isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                
                {/* Visual pulsating background chimes */}
                {isRunning && (
                  <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-3xl animate-pulse" />
                )}

                <div className="relative z-10 w-full flex flex-col items-center">
                  
                  {/* Course color badge indicators */}
                  {timerType === "break" ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl text-[10px] text-emerald-400 font-extrabold uppercase mb-1">
                      ☕ MOLA / DİNLENME SÜRESİ
                    </div>
                  ) : activeSubject ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl text-[10px] text-indigo-400 font-extrabold uppercase mb-1">
                      📚 {activeSubject.name} • {activeSubject.exam_type}
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-[10px] text-red-400 font-extrabold uppercase mb-1">
                      DERS SEÇİLMEDİ
                    </div>
                  )}

                  {timerType === "break" ? (
                    <span className="text-[10px] text-gray-500 block mb-4">
                      Görev: Zihninizi Yenileyin 🧠
                    </span>
                  ) : activeTopic ? (
                    <span className="text-[10px] text-gray-500 max-w-[200px] truncate block mb-4">
                      Görev: {activeTopic.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 block mb-4">
                      Konu: Genel Tekrar
                    </span>
                  )}

                  {/* Pulsing visual clock circle */}
                  <div className="relative flex items-center justify-center my-2">
                    {/* Glowing outer progress ring */}
                    <div className="w-44 h-44 rounded-full border border-white/5 flex flex-col items-center justify-center shadow-lg bg-slate-950 relative">
                       
                      <CircularTimerRing strokeDashoffset={strokeDashoffset} isRunning={isRunning} />

                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#f59e0b] font-black">
                        {timerType === "focus" ? "ODAKLAN" : "MOLA"}
                      </span>
                      <h2 className="text-2xl font-black text-white font-mono tracking-wide mt-1">
                        {formatDisplayTime(elapsedSeconds)}
                      </h2>
                      <span className="text-[8px] font-mono text-gray-400 mt-1">
                        {!isFreeMode 
                          ? `Hedef: ${timerType === "focus" ? focusGoalMinutes : breakGoalMinutes} dk` 
                          : "Serbest Sayım"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Play controls */}
                  <div className="flex gap-2 w-full mt-4">
                    <button
                      onClick={handleToggleTimer}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1 text-slate-950 cursor-pointer ${
                        isRunning 
                          ? "bg-amber-500 hover:bg-amber-450 active:scale-95 shadow-md"
                          : "bg-emerald-500 hover:bg-emerald-450 active:scale-95 shadow-md"
                      }`}
                    >
                      {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      {isRunning ? "Durdur" : "Başlat"}
                    </button>

                    <button
                      onClick={handleFinishPrompt}
                      className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-indigo-600/10 shadow-lg"
                    >
                      {timerType === "focus" ? (
                        <>
                          <CheckCircle className="w-4 h-4" /> Bitir
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" /> Atla
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleResetTimer}
                      className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        isDarkMode ? "bg-slate-950 border-white/5 text-gray-400 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Sıfırla"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
              
              {/* COMPLETED RECENT FOCUS PROGRESS */}
              <div className={`p-4 rounded-[20px] border flex flex-col gap-2 ${
                isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-slate-50 border-slate-201 shadow-xs"
              }`}>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">ÇALIŞMA GÖZLEMCİSİ</span>
                <p className="text-[11px] text-gray-450 leading-relaxed">
                  Bugün fethettiğiniz ders konuları ve harcadığınız toplam dakikalar rapor ekranına aktarılır. Çalışmalarınızla XP kazanabilirsiniz!
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          C. MODAL DIALOGS: ADD DERS (SUBJECT) INTERACTIVE MODAL
          ======================================================== */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-text">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                📚 Sokratik Yeni Ders Ekle
              </h3>
              <button 
                onClick={() => setShowSubjectModal(false)}
                className="text-gray-450 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Ders Adı</label>
                <input
                  type="text"
                  placeholder="Örn: Edebiyat, Kimya, Geometri..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="bg-slate-950 border border-slate-820 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Sınav Kategorisi</label>
                <select
                  value={newSubjectExam}
                  onChange={(e) => setNewSubjectExam(e.target.value)}
                  className="bg-slate-950 border border-slate-820 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 select-none"
                >
                  <option value="TYT-AYT">TYT-AYT (Klasik)</option>
                  <option value="TYT">Yalnız TYT</option>
                  <option value="AYT">Yalnız AYT</option>
                  <option value="SÖZEL">AYT Sözel</option>
                  <option value="LGS/KPSS">Diğer / Kolej</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-400 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-black text-white cursor-pointer"
                >
                  Dersi Kaydet ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          D. MODAL DIALOGS: ADD TOPIC (SUBJECT TOPICS) MODAL
          ======================================================== */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-text">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                📖 Derse Yeni Konu Ünitesi Bağla
              </h3>
              <button 
                onClick={() => setShowTopicModal(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Aktif Ders</label>
                <div className="p-2.5 bg-slate-950 rounded-xl text-xs text-indigo-300 font-bold border border-indigo-500/10">
                  {activeSubject ? activeSubject.name : "-- Ders Listesi Boş --"}
                </div>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Konu / Modül Başlığı</label>
                <input
                  type="text"
                  placeholder="Örn: Limit ve Süreklilik, Hücre Bölünmesi..."
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="bg-slate-950 border border-slate-820 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] font-bold text-indigo-400 uppercase">Müfredat Kısa Açıklaması (İsteğe Bağlı)</label>
                <input
                  type="text"
                  placeholder="Örn: ÖSYM'nin her yıl soru çıkardığı kritik analiz aşaması."
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  className="bg-slate-950 border border-slate-820 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-400 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-450 rounded-xl text-xs font-black text-slate-950 cursor-pointer"
                >
                  Üniteyi Kaydet ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          E. MODAL DIALOGS: NOTE REFLECTIVE DIALOG ON COMPLETION
          ======================================================== */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-text">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col gap-3.5 text-left">
            <h3 className="text-sm font-black text-emerald-450 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-800 pb-3">
              🎉 ODAK SEANSINIZI TAÇLANDIRIN!
            </h3>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              Öğretici bir maratonu tamamladınız! Bu çalışma seansı için ne kadar soru çözdüğünüzü veya kendinize aldığınız kısa bir YKS ders notunu kaydedebilirsiniz:
            </p>

            <textarea
              rows={3}
              placeholder="Örn: Türev kurallarını çalıştım ve 40 adet test sorusu çözdüm. Çıkan hataları Sokratas'a analiz ettirdim..."
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-820 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 outline-none"
            />

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={handleSaveSession}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-450 rounded-xl text-xs font-black text-slate-950 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                Seansı Kaydet & Bitir ✓
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Subordinate optimized absolute SVG timer circumference component
function CircularTimerRing({ strokeDashoffset, isRunning }: { strokeDashoffset: number; isRunning: boolean }) {
  return (
    <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none scale-[1.03]">
      {/* Background loop tracking circle */}
      <circle
        cx="50%"
        cy="50%"
        r="44"
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.04)"
        strokeWidth="3.5"
      />
      {/* Front colored progress tracking circle with sliding dash */}
      <circle
        cx="50%"
        cy="50%"
        r="44"
        fill="transparent"
        stroke="url(#timerCircleGrad)"
        strokeWidth="3.8"
        strokeDasharray="276"
        strokeDashoffset={276 - strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-300"
      />
      <defs>
        <linearGradient id="timerCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}
