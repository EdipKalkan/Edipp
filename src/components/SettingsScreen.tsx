import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Key, 
  Trash2, 
  ShieldAlert, 
  Moon, 
  Sun, 
  Layout, 
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Award,
  BookOpen,
  PlusCircle,
  ListRestart
} from "lucide-react";
import { db, DB_AppSettings } from "../services/databaseService";
import { DB_Subject, DB_Topic } from "../types";

interface SettingsScreenProps {
  onSettingsChange: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function SettingsScreen({ onSettingsChange, isDarkMode, onToggleTheme }: SettingsScreenProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<any>("gemini-3.1-flash-lite");
  const [explanationLevel, setExplanationLevel] = useState<"Ekonomik" | "Dengeli" | "Kaliteli">("Ekonomik");
  const [economyMode, setEconomyMode] = useState<boolean>(true);

  // Subject and Topic Insertion Management
  const [subjects, setSubjects] = useState<DB_Subject[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [newSubjectExamType, setNewSubjectExamType] = useState<string>("TYT/AYT");

  const [newTopicName, setNewTopicName] = useState<string>("");
  const [newTopicSubjectId, setNewTopicSubjectId] = useState<string>("");

  // Api Logs Summary
  const [usageStats, setUsageStats] = useState<any>({ count: 0, totalTokens: 0, estimatedCost: 0 });

  useEffect(() => {
    // Load current app settings
    const settings = db.getSettings();
    setApiKey(settings.gemini_api_key || "");
    setSelectedModel(settings.selected_model || "gemini-3.1-flash-lite");
    setExplanationLevel(settings.explanation_level || "Ekonomik");
    setEconomyMode(settings.economy_mode_enabled !== false);

    // Load subjects
    const list = db.getSubjects();
    setSubjects(list);
    if (list.length > 0) {
      setNewTopicSubjectId(list[0].id);
    }

    // Load API token logging summary for today
    const summary = db.getLogsSummary();
    setUsageStats(summary);
  }, []);

  const handleSaveSettings = () => {
    const origSettings = db.getSettings();
    const updated: any = {
      ...origSettings,
      gemini_api_key: apiKey.trim(),
      selected_model: selectedModel,
      explanation_level: explanationLevel,
      economy_mode_enabled: economyMode,
    };
    db.saveSettings(updated);
    onSettingsChange(); // Let parent refresh configurations
    alert("Ayarlarınız başarıyla yerel SQLite tablonuza kaydedildi!");
  };

  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    // Procedural color list (pick random)
    const colorOptions = ["#6366F1", "#EEF2F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];
    const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];

    const newSub: DB_Subject = {
      id: "sub_user_" + Math.random().toString(36).substring(2, 9),
      name: newSubjectName.trim(),
      exam_type: newSubjectExamType,
      color: randomColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.addSubject(newSub);
    
    // Refresh
    const list = db.getSubjects();
    setSubjects(list);
    setNewTopicSubjectId(newSub.id);
    setNewSubjectName("");
    alert(`"${newSub.name}" dersi başarıyla eklendi!`);
  };

  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicSubjectId) return;

    const newTopic: DB_Topic = {
      id: "top_user_" + Math.random().toString(36).substring(2, 9),
      subject_id: newTopicSubjectId,
      name: newTopicName.trim(),
      description: "Özel eklenmiş konu",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.addTopic(newTopic);
    setNewTopicName("");
    alert(`"${newTopic.name}" alt konusu ders listesine eklendi!`);
  };

  // Sync default model selections based on modes
  const handleExplanationLevelChange = (level: "Ekonomik" | "Dengeli" | "Kaliteli") => {
    setExplanationLevel(level);
    if (level === "Ekonomik") {
      setSelectedModel("gemini-3.1-flash-lite");
    } else if (level === "Dengeli") {
      setSelectedModel("gemini-2.5-flash");
    } else {
      setSelectedModel("gemini-3.1-pro-preview");
    }
  };

  const handleClearUsageLogs = () => {
    if (confirm("Bugünkü yapay zeka token/maliyet kullanım logs geçmişini temizlemek istiyor musunuz?")) {
      db.saveList("api_usage_logs", []);
      setUsageStats({ count: 0, totalTokens: 0, estimatedCost: 0 });
    }
  };

  return (
    <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
      <div>
        <h2 className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Uygulama Ayarları
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          SQLite program ayarları, Gemini API limit koordinatları ve ders yönetimi
        </p>
      </div>

      {/* API Configuration Card */}
      <div className={`p-5 rounded-[24px] border ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-3.5 flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
          <Key className="w-4.5 h-4.5 text-indigo-400" />
          Yapay Zeka API Yapılandırması
        </h3>

        <div className="flex flex-col gap-3.5 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className={`p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-205 text-slate-800"}`}
            />
            <p className="text-[9px] text-gray-500 leading-tight">
              API Anahtarınız güvenli bir şekilde telefonunuzun yerel hafızasında tutulur. Başka bir sunucuyla kesinlikle paylaşılmaz.
            </p>
          </div>

          {/* Model selection by modes */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Zeka Modu (Maliyet / Kalite Dengesi)</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/65 rounded-xl text-center border border-white/5 font-bold text-[10px]">
              {["Ekonomik", "Dengeli", "Kaliteli"].map((lvl) => {
                const isActive = explanationLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleExplanationLevelChange(lvl as any)}
                    className={`py-2 rounded-lg cursor-pointer ${
                      isActive ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Aktif Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className={`p-3 rounded-xl border focus:outline-none ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <optgroup label="Ekonomik Mod Modelleri">
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Hızlı & Hesaplı)</option>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Kararlı LITE)</option>
              </optgroup>
              <optgroup label="Dengeli Mod Modelleri">
                <option value="gemini-2.5-flash">gemini-2.5-flash (Standart Flash)</option>
              </optgroup>
              <optgroup label="Kaliteli Mod Modelleri">
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Yüksek Mantık Kapasitesi)</option>
              </optgroup>
            </select>
          </div>

          <button
            onClick={handleSaveSettings}
            className="mt-2 text-xs py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-white transition-all rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 uppercase"
          >
            <CheckCircle className="w-4 h-4" />
            Konfigürasyonları Yerel SQLite'a Kaydet
          </button>
        </div>
      </div>

      {/* Theme Switching Tab */}
      <div className={`p-4 rounded-[24px] border flex items-center justify-between text-xs ${isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        <div className="flex items-center gap-2">
          {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          <div>
            <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-850"}`}>Tema Arayüz Tercihi</span>
            <p className="text-[10px] text-gray-500">Karanlık / Aydınlık mod geçişini ayarla</p>
          </div>
        </div>
        <button
          onClick={onToggleTheme}
          className={`px-3 py-1.5 rounded-xl font-bold font-mono text-[10px] uppercase border tracking-widest ${
            isDarkMode 
              ? "bg-slate-900 hover:bg-slate-800 border-white/10 text-white" 
              : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
          }`}
        >
          {isDarkMode ? "Aydınlık Yap" : "Karanlık Yap"}
        </button>
      </div>

      {/* Custom Curriculum Creation Section */}
      <div className={`p-5 rounded-[24px] border ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
          <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
          Kişisel Ders ve Konu Ekleme (Müfredat)
        </h3>

        {/* Part A: Add Subject */}
        <form onSubmit={handleAddCustomSubject} className="flex flex-col gap-3 text-xs border-b border-indigo-500/10 pb-4 mb-4">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">A) Yeni Ders / Seçmeli Sınav Dalı Tanımla</span>
          
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Örn: Geometri, KPSS Tarih, AYT Edebiyat"
              className={`p-2.5 rounded-xl border focus:outline-none ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            />
            <select
              value={newSubjectExamType}
              onChange={(e) => setNewSubjectExamType(e.target.value)}
              className={`p-2.5 rounded-xl border focus:outline-none ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <option value="TYT">TYT Sınavı</option>
              <option value="AYT">AYT Sınavı</option>
              <option value="KPSS">KPSS Sınavı</option>
              <option value="TYT/AYT">TYT ve AYT Ortak</option>
            </select>
          </div>

          <button
            type="submit"
            className="text-[11px] py-2 bg-emerald-700 hover:bg-emerald-600 font-bold text-white transition-all rounded-lg flex items-center justify-center gap-1 uppercase"
          >
            Ders Ekle
          </button>
        </form>

        {/* Part B: Add Subtopic */}
        <form onSubmit={handleAddCustomTopic} className="flex flex-col gap-3 text-xs">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">B) Derse Ait Alt Başlık / Alt Konu Atama</span>
          
          <div className="flex flex-col gap-1">
            <select
              value={newTopicSubjectId}
              onChange={(e) => setNewTopicSubjectId(e.target.value)}
              className={`p-2.5 rounded-xl border focus:outline-none ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <option value="" disabled>Hedef Dersi Seç...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.exam_type})</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            placeholder="Örn: Trigonometri-I, Paragraf Yardımcı Düşünce"
            className={`p-2.5 rounded-xl border focus:outline-none ${isDarkMode ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-850"}`}
          />

          <button
            type="submit"
            disabled={!newTopicSubjectId || !newTopicName.trim()}
            className="text-[11px] py-2 bg-emerald-700 hover:bg-emerald-600 font-bold text-white transition-all rounded-lg flex items-center justify-center gap-1 uppercase disabled:opacity-50"
          >
            Konu Başlığı Atama Yap
          </button>
        </form>
      </div>

      {/* API Logs and Cost Tracking Summary Box */}
      <div className={`p-4 rounded-[24px] border ${isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] tracking-wider uppercase font-bold text-gray-400">Bugünkü Tahmini Tüketim Raporu</span>
          <button
            onClick={handleClearUsageLogs}
            className="text-[9px] text-red-400 hover:text-red-300 font-bold"
          >
            Logları Temizle
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-2 bg-slate-950/40 border border-white/5 rounded-xl">
            <span className="text-[9px] text-gray-500 uppercase block">Talep Sayısı</span>
            <span className="font-extrabold text-indigo-400 font-mono mt-0.5 block">{usageStats.count} seans</span>
          </div>
          <div className="p-2 bg-slate-950/40 border border-white/5 rounded-xl">
            <span className="text-[9px] text-gray-500 uppercase block">Toplam Token</span>
            <span className="font-extrabold text-indigo-400 font-mono mt-0.5 block">{usageStats.totalTokens} token</span>
          </div>
          <div className="p-2 bg-slate-950/40 border border-white/5 rounded-xl">
            <span className="text-[9px] text-gray-500 uppercase block">Yapay Zeka Maliyeti</span>
            <span className="font-extrabold text-emerald-400 font-mono mt-0.5 block">${usageStats.estimatedCost.toFixed(5)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
