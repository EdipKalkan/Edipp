import React, { useState, useEffect } from "react";
import { 
  Play, 
  Sparkles, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { db } from "../services/databaseService";
import { gemini } from "../services/geminiService";
import { DB_Subject, DB_Topic, DB_StudySession } from "../types";
import MarkdownView from "./MarkdownView";

interface HomeScreenProps {
  onStartTimer: (subjectId: string, topicId?: string) => void;
  onStartQuiz: () => void;
  isDarkMode: boolean;
}

export default function HomeScreen({ onStartTimer, onStartQuiz, isDarkMode }: HomeScreenProps) {
  const [subjects, setSubjects] = useState<DB_Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [topics, setTopics] = useState<DB_Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  
  const [todaySeconds, setTodaySeconds] = useState<number>(0);
  const [weeklySeconds, setWeeklySeconds] = useState<number>(0);
  const [recentSessions, setRecentSessions] = useState<DB_StudySession[]>([]);
  
  // AI Coaching Feedback Box
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    // Sync states from local SQLite representation
    const subs = db.getSubjects();
    setSubjects(subs);
    if (subs.length > 0) {
      setSelectedSubjectId(subs[0].id);
    }

    setTodaySeconds(db.getTodayStudyTimeSeconds());
    setWeeklySeconds(db.getWeeklyStudyTimeSeconds());
    setRecentSessions(db.getStudySessions().slice(0, 3)); // Display top 3 last sessions

    // Retrieve last cached analysis from log histories
    const logs = db.getGeminiAnalysisLogs();
    const lastDaily = logs.find(l => l.analysis_type === "daily");
    if (lastDaily) {
      setAiAnalysis(lastDaily.output_text);
    }
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      const tops = db.getTopics(selectedSubjectId);
      setTopics(tops);
      if (tops.length > 0) {
        setSelectedTopicId(tops[0].id);
      } else {
        setSelectedTopicId("");
      }
    } else {
      setTopics([]);
      setSelectedTopicId("");
    }
  }, [selectedSubjectId]);

  const handleQuickStart = () => {
    if (!selectedSubjectId) return;
    onStartTimer(selectedSubjectId, selectedTopicId || undefined);
  };

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const feedback = await gemini.analyzeDailyStudy();
      setAiAnalysis(feedback);
      
      // Update quick durations
      setTodaySeconds(db.getTodayStudyTimeSeconds());
      setWeeklySeconds(db.getWeeklyStudyTimeSeconds());
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API_KEY_NOT_CONFIGURED")) {
        setAnalysisError("Gemini API anahtarı ayarlanmamış. Lütfen Ayarlar sekmesinden geçerli bir API anahtarı tanımlayın.");
      } else {
        setAnalysisError(err.message || "Analiz oluşturulurken hata oluştu.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatMinDisplay = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins} dk`;
  };

  return (
    <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
      {/* Dynamic Header */}
      <div id="home-header" className="flex justify-between items-start animate-fade-in-down mt-1">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Sokrates <span className="text-indigo-400 font-semibold text-2xl">Öğrenci Asistanı</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Yerel Ders Çalışma Koçu ve Sınav Asistanı • Çevrimdışı Bellek Destekli
          </p>
        </div>
        <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300">Sokrates AI</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div id="stats-card-today" className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-all hover:scale-[1.01] ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
          <div className="flex items-center justify-between text-indigo-400">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500">Bugün</span>
          </div>
          <span className={`text-2xl font-black mt-2 font-mono ${isDarkMode ? "text-white" : "text-slate-850"}`}>
            {formatMinDisplay(todaySeconds)}
          </span>
          <span className="text-[11px] text-gray-500">Net Odak Süresi</span>
        </div>

        <div id="stats-card-weekly" className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-all hover:scale-[1.01] ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
          <div className="flex items-center justify-between text-emerald-400">
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500">Son 7 Gün</span>
          </div>
          <span className={`text-2xl font-black mt-2 font-mono ${isDarkMode ? "text-white" : "text-slate-850"}`}>
            {formatMinDisplay(weeklySeconds)}
          </span>
          <span className="text-[11px] text-gray-500">Haftalık Toplam</span>
        </div>
      </div>

      {/* Quick Launch Focus Timer Setup Helper */}
      <div id="home-quick-start" className={`p-5 rounded-[24px] border ${isDarkMode ? "bg-indigo-950/20 border-indigo-900/30" : "bg-indigo-50/40 border-indigo-100 shadow-sm"}`}>
        <h2 className={`text-base font-bold flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
          <Play className="w-4.5 h-4.5 text-indigo-400" />
          Hızlı Odaklanma Sayacı Başlat
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Ders ve konu seçerek pürüzsüz sayaç oturumuna geç
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Branş / Ders</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className={`text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? "bg-slate-900/80 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.exam_type})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Çalışılacak Konu</label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={topics.length === 0}
              className={`text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? "bg-slate-900/80 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"} disabled:opacity-50`}
            >
              {topics.length > 0 ? (
                topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              ) : (
                <option value="">Konu Yok</option>
              )}
            </select>
          </div>
        </div>

        <button
          onClick={handleQuickStart}
          disabled={!selectedSubjectId}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 transition-all font-bold text-xs py-3 text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current text-white" />
          Odaklanmayı Başlat
        </button>
      </div>

      {/* Quick Quiz Entry Widget */}
      <div 
        id="home-quiz-quick" 
        onClick={onStartQuiz}
        className={`p-4 rounded-[22px] border flex items-center justify-between gap-3 transition-all hover:scale-[1.01] cursor-pointer ${isDarkMode ? "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20 hover:bg-amber-500/10" : "bg-amber-50/40 border-amber-100 shadow-sm hover:bg-amber-50"}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-sm font-extrabold select-none">
            📝
          </div>
          <div>
            <h4 className={`text-xs font-bold leading-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              KPSS / TYT Tarih Quiz Modülü
            </h4>
            <p className="text-[10px] text-amber-500 font-semibold mt-0.5 font-mono">
              10 Soru • Osmanlı Tarihi Deneme Sınavı
            </p>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onStartQuiz();
          }}
          className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-0.5 select-none cursor-pointer"
        >
          <span>Başla</span>
          <ChevronRight className="w-3 h-3 text-slate-950 stroke-[3]" />
        </button>
      </div>

      {/* Embedded Sokrates Gemini Agent Dashboard Widget */}
      <div id="home-coaching-hub" className={`p-5 rounded-[24px] border ${isDarkMode ? "bg-[#0d1025]/60 border-indigo-950" : "bg-white border-slate-100 shadow-sm"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                Sokrates AI Günlük Çalışma Koçu
              </h3>
              <p className="text-[10px] text-gray-500">
                Veritabanı analizi bazlı performans karnesi ve tavsiyeler
              </p>
            </div>
          </div>

          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzing}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? "hover:bg-slate-800 bg-slate-900 text-gray-400" : "hover:bg-slate-50 bg-slate-100 text-gray-500"} disabled:opacity-50`}
            title="Analiz Güncelle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        <div className="mt-4 min-h-[80px]">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-6">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[11px] font-medium text-indigo-400 font-mono">
                Süreler ve notlar analiz ediliyor...
              </p>
            </div>
          ) : analysisError ? (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-550/20 text-red-400 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          ) : aiAnalysis ? (
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs leading-relaxed max-h-[300px] overflow-y-auto">
              <MarkdownView content={aiAnalysis} />
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1">
              <span className="text-xs text-slate-400 font-medium">Günlük Karne Henüz Oluşturulmadı</span>
              <p className="text-[10px] text-gray-500 max-w-[80%] mx-auto">
                Bugünkü çalışmalarınızı değerlendirmek ve kişisel çalışma koçluğu almak için aşağıdaki butona basın.
              </p>
              <button
                onClick={handleRunAiAnalysis}
                className="mt-3 text-[11px] px-4 py-1.5 font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all rounded-lg shadow-sm"
              >
                Karneyi Hazırla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Log */}
      <div id="home-recent-activity">
        <div className="flex justify-between items-center mb-2.5 px-1">
          <h3 className={`text-xs uppercase font-mono tracking-wider font-bold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Son Çalışma Kayıtları
          </h3>
          <span className="text-[10px] text-gray-500 font-mono">
            {recentSessions.length} Oturum
          </span>
        </div>

        {recentSessions.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {recentSessions.map((session) => {
              const subject = subjects.find(s => s.id === session.subject_id);
              const subjectColor = subject?.color || "#4F46E5";
              const topic = db.getTopics().find(t => t.id === session.topic_id);
              const formattedDate = new Date(session.started_at).toLocaleString("tr-TR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div 
                  key={session.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xs"}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                      className="w-1.5 h-8 shrink-0 rounded-full" 
                      style={{ backgroundColor: subjectColor }}
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                          {subject?.name || "Ders"}
                        </span>
                        {topic && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono ${isDarkMode ? "bg-slate-800 text-indigo-300" : "bg-slate-100 text-slate-600"}`}>
                            {topic.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block truncate">
                        {formattedDate} • {session.note || "Ekstra not girilmedi."}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm text-indigo-400 font-mono">
                      {formatMinDisplay(session.duration_seconds)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-[10px] text-gray-500">
              Henüz ders çalışma oturumu kaydedilmedi. Başlat butonu ile ilk seansını tut!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
