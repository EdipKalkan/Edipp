import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calendar, 
  Map, 
  HelpCircle, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Brain,
  Timer,
  Lightbulb,
  Workflow,
  PlusCircle
} from "lucide-react";
import { db } from "../services/databaseService";
import { gemini } from "../services/geminiService";
import { DB_Subject } from "../types";
import MarkdownView from "./MarkdownView";

interface GeminiCoachScreenProps {
  isDarkMode: boolean;
}

export default function GeminiCoachScreen({ isDarkMode }: GeminiCoachScreenProps) {
  const [activeCoachTab, setActiveCoachTab] = useState<"weekly_report" | "study_plan" | "weak_topic" | "practice_quiz">("weekly_report");
  
  // Loading and result states
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [coachResponse, setCoachResponse] = useState<string>("");

  // Plan Input State
  const [subjects, setSubjects] = useState<DB_Subject[]>([]);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");

  // Explain Input State
  const [weakTopicName, setWeakTopicName] = useState<string>("");

  useEffect(() => {
    const list = db.getSubjects();
    setSubjects(list);
    if (list.length > 0) {
      setSelectedSubjectName(list[0].name);
    }

    // Preload last weekly review if available
    const logs = db.getGeminiAnalysisLogs();
    const lastWeekly = logs.find(l => l.analysis_type === "weekly");
    if (lastWeekly && activeCoachTab === "weekly_report") {
      setCoachResponse(lastWeekly.output_text);
    }
  }, []);

  // Update showing response based on tab loading
  useEffect(() => {
    setCoachResponse("");
    setApiError(null);
    const logs = db.getGeminiAnalysisLogs();

    if (activeCoachTab === "weekly_report") {
      const last = logs.find(l => l.analysis_type === "weekly");
      if (last) {
        setCoachResponse(last.output_text);
      }
    }
  }, [activeCoachTab]);

  const handleWeeklyReport = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const resp = await gemini.analyzeWeeklyStudy();
      setCoachResponse(resp);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API_KEY_NOT_CONFIGURED")) {
        setApiError("Gemini API anahtarı ayarlanmamış. Lütfen Ayarlar sekmesinden geçerli bir API anahtarı tanımlayın.");
      } else {
        setApiError(err.message || "Haftalık karne hazırlanırken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStudyPlan = async () => {
    if (!selectedSubjectName) return;
    setLoading(true);
    setApiError(null);
    try {
      const resp = await gemini.suggestNextStudyPlan(selectedSubjectName);
      setCoachResponse(resp);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API_KEY_NOT_CONFIGURED")) {
        setApiError("Gemini API anahtarı ayarlar sekmesinde girilmedi.");
      } else {
        setApiError(err.message || "Özel çalışma planı üretilirken hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExplainWeakTopic = async () => {
    if (!weakTopicName.trim()) {
      alert("Lütfen zorlandığınız konuyu giriniz.");
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const resp = await gemini.explainWeakTopic(weakTopicName.trim());
      setCoachResponse(resp);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API_KEY_NOT_CONFIGURED")) {
        setApiError("Hizmet için geçerli bir API anahtarı tanımlamalısınız.");
      } else {
        setApiError(err.message || "Konu açıklanırken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePracticeQuiz = async () => {
    setLoading(true);
    setApiError(null);
    
    // Aggregate recent sessions context dynamically
    const sessions = db.getStudySessions().slice(0, 4);
    const contextLines = sessions.map(s => {
      const matchingSub = db.getSubjects().find(sub => sub.id === s.subject_id);
      const matchingTop = db.getTopics().find(t => t.id === s.topic_id);
      return `${matchingSub?.name || "Ders"} - ${matchingTop?.name || "Konu"} (Not: ${s.note || "Yok"})`;
    });

    const contextPayload = contextLines.length > 0 
      ? contextLines.join("\n") 
      : "Sayılar ve Harita Bilgisi Genel Giriş";

    try {
      const resp = await gemini.generatePracticeQuestions(contextPayload);
      setCoachResponse(resp);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API_KEY_NOT_CONFIGURED")) {
        setApiError("Kişisel soru üretimi için ayarlarda API key bulunmalıdır.");
      } else {
        setApiError(err.message || "Özel deneme testi oluşturulurken hata.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 mt-1">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
          <Brain className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className={`text-lg font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Sokrates Çalışma Koçu
          </h2>
          <p className="text-[11px] text-gray-500">
            Ders programı analizi yap, rehberlik al ve zor konuları anla
          </p>
        </div>
      </div>

      {/* Tabs segment */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
        {[
          { id: "weekly_report", name: "Haftalık Rapor", icon: Calendar },
          { id: "study_plan", name: "Ders Çalışma Planı", icon: Lightbulb },
          { id: "weak_topic", name: "Konu Anlatıcı", icon: HelpCircle },
          { id: "practice_quiz", name: "Pratik Test", icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCoachTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCoachTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" 
                  : isDarkMode 
                    ? "bg-slate-900 hover:bg-slate-800 text-gray-400" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-650"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Inputs according to active tab */}
      <div className={`p-4 rounded-3xl border ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        {activeCoachTab === "weekly_report" && (
          <div className="flex flex-col gap-2.5 text-center py-2">
            <h4 className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
              7 Günlük Program Dengesi Analizi
            </h4>
            <p className="text-[11px] text-gray-500 max-w-[90%] mx-auto leading-relaxed">
              Veritabanından geçen 7 güne ait toplam odak dakikalarınızı çeker ve branş dağılımınızı rasyonel koçluk süzgeciyle değerlendirir.
            </p>
            <button
              onClick={handleWeeklyReport}
              disabled={loading}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500 transition-colors py-2.5 px-6 font-bold text-xs text-white rounded-xl shadow-lg flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Calendar className="w-3.5 h-3.5" />}
              Haftalık Karneyi Çıkar
            </button>
          </div>
        )}

        {activeCoachTab === "study_plan" && (
          <div className="flex flex-col gap-3">
            <h4 className={`text-xs font-bold uppercase ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
              Özel Çalışma Yol Haritası Hazırla
            </h4>
            
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[10px] text-slate-500 tracking-wider font-bold">YOL HARİTASI İSTEDİĞİNİZ DERS</label>
              <select
                value={selectedSubjectName}
                onChange={(e) => setSelectedSubjectName(e.target.value)}
                className={`text-xs p-3 rounded-xl border focus:outline-none ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.exam_type})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStudyPlan}
              disabled={loading || !selectedSubjectName}
              className="bg-indigo-600 hover:bg-indigo-500 transition-colors py-2.5 font-bold text-xs text-white rounded-xl shadow-md w-full flex items-center justify-center gap-1 mt-1 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
              Çalışma Yol Haritası Öner
            </button>
          </div>
        )}

        {activeCoachTab === "weak_topic" && (
          <div className="flex flex-col gap-3">
            <h4 className={`text-xs font-bold uppercase ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
              En Zayıf Konuyu Sokrates'e Anlattır
            </h4>
            
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[10px] text-slate-500 tracking-wider font-bold">ZORLANDIĞINIZ KONU BAŞLIĞI</label>
              <input
                type="text"
                value={weakTopicName}
                onChange={(e) => setWeakTopicName(e.target.value)}
                placeholder="Örn: Limit-Süreklilik, Türkiye Bölge Tipleri, Paragraf Soruları"
                className={`text-xs p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
              />
            </div>

            <button
              onClick={handleExplainWeakTopic}
              disabled={loading || !weakTopicName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 transition-colors py-2.5 font-bold text-xs text-white rounded-xl shadow-md w-full flex items-center justify-center gap-1.5 mt-1 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              Konuyu Sadeleştirerek Açıkla
            </button>
          </div>
        )}

        {activeCoachTab === "practice_quiz" && (
          <div className="flex flex-col gap-2.5 text-center py-2">
            <h4 className={`text-xs font-extrabold uppercase tracking-wide ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
              Kişiselleştirilmiş Sınav Odaklı Soru Üretici
            </h4>
            <p className="text-[11px] text-gray-500 max-w-[90%] mx-auto leading-relaxed">
              En son kaydettiğiniz sayaç seanslarındaki notları süzgeçten geçirerek tam o başlıklarla entegre 2 özgün TYT/AYT deneme sorusu ve çözümü oluşturur.
            </p>
            <button
              onClick={handleGeneratePracticeQuiz}
              disabled={loading}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500 transition-colors py-2.5 px-6 font-bold text-xs text-white rounded-xl shadow-lg flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Deneme Sorusu Üret
            </button>
          </div>
        )}
      </div>

      {/* Main Results Board */}
      <div className="flex-1 min-h-[220px]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-16 border rounded-3xl border-slate-850 bg-slate-900/10">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-indigo-400 font-mono animate-pulse">
              Gemini Sokrates akıl yürütüyor...
            </span>
          </div>
        ) : apiError ? (
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        ) : coachResponse ? (
          <div className={`p-5 rounded-3xl border h-full leading-relaxed max-w-full text-xs animate-fade-in ${
            isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-sm"
          }`}>
            <div className="flex items-center gap-1.5 mb-3 border-b border-indigo-500/10 pb-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className={`font-black uppercase tracking-wide text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                Sokrates Analiz Raporu
              </span>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto pr-1">
              <MarkdownView content={coachResponse} />
            </div>
          </div>
        ) : (
          <div className="h-full py-16 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-1.5 text-center">
            <Brain className="w-8 h-8 text-slate-700 animate-pulse" />
            <span className="text-xs text-slate-400 font-bold">Tavsiye Hazırlanmadı</span>
            <p className="text-[10px] text-gray-500 max-w-[80%]">
              Yukarıdaki sekmelerden birini seçin ve analiz işlemine başlayın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
