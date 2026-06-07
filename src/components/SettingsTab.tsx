import React, { useState, useEffect } from "react";
import { 
  Key, 
  Save, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Shield, 
  ShieldCheck, 
  GraduationCap, 
  Layout, 
  Languages, 
  Coins, 
  Activity, 
  Scale, 
  Check,
  AlertTriangle
} from "lucide-react";
import { AppSettings, ExplanationMode } from "../types";
import { db } from "../services/databaseService";

interface SettingsTabProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClearCache: () => void;
}

export default function SettingsTab({ settings, onSaveSettings, onClearCache }: SettingsTabProps) {
  // Sync core values
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey);
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>(settings.explanationMode);
  const [themeState, setThemeState] = useState(settings.theme);
  const [selectedModel, setSelectedModel] = useState<string>(settings.selected_model || "gemini-3.1-flash-lite");
  const [explanationLevel, setExplanationLevel] = useState<"Ekonomik" | "Dengeli" | "Kaliteli">(
    settings.explanation_level || "Ekonomik"
  );
  const [apiReductionMode, setApiReductionMode] = useState<boolean>(
    settings.api_reduction_mode !== false
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Real-time API consumption metrics from DB
  const [stats, setStats] = useState({ count: 0, totalTokens: 0, estimatedCost: 0 });

  useEffect(() => {
    // Read directly from DB usage stats logs
    const currentStats = db.getLogsSummary();
    setStats(currentStats);
  }, []);

  // Sync state transitions when level changes
  const handleLevelChange = (level: "Ekonomik" | "Dengeli" | "Kaliteli") => {
    setExplanationLevel(level);
    if (level === "Ekonomik") {
      setSelectedModel("gemini-3.1-flash-lite");
      setApiReductionMode(true);
    } else if (level === "Dengeli") {
      setSelectedModel("gemini-2.5-flash");
      setApiReductionMode(false);
    } else if (level === "Kaliteli") {
      setSelectedModel("gemini-3.1-pro-preview");
      setApiReductionMode(false);
    }
  };

  const handleSave = () => {
    // Propagate changes up & persist
    const updatedSettings: AppSettings = {
      ...settings,
      apiKey: apiKeyInput,
      explanationMode,
      theme: themeState,
      selected_model: selectedModel,
      explanation_level: explanationLevel,
      api_reduction_mode: apiReductionMode,
    };
    
    onSaveSettings(updatedSettings);

    // Write back into SQLite structures too to keep both stores in sync
    db.saveSettings({
      gemini_api_key: apiKeyInput,
      selected_model: selectedModel as any,
      answer_language: "tr",
      explanation_level: explanationLevel,
      theme: themeState,
      economy_mode_enabled: apiReductionMode
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
  };

  const isDarkMode = themeState === "dark";

  return (
    <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
      {/* Title Header */}
      <div id="settings-title">
        <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Ayarlar & Maliyet Denetimi
        </h2>
        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Sokrates Akıllı Çalışma & API kota yönetim paneli.
        </p>
      </div>

      {/* 1. Economical Mode Selector Section */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDarkMode ? "bg-[#0d1125]/60 border-white/5 shadow-inner" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg">
            <Scale className="w-4 h-4" />
          </div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            Bütçe ve Analiz Modu
          </h3>
        </div>

        <p className={`text-[11px] mb-3 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Mod seçimi yapay zeka cevap derinliğini ve api tüketim parametrelerini optimize eder.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Ekonomik Mod */}
          <button
            onClick={() => handleLevelChange("Ekonomik")}
            className={`py-2 px-1 text-center rounded-xl border flex flex-col items-center justify-center transition-all ${
              explanationLevel === "Ekonomik"
                ? "bg-emerald-505 bg-emerald-500/10 border-emerald-500/50 text-emerald-450 font-bold"
                : isDarkMode ? "bg-black/20 border-white/5 text-gray-500" : "bg-slate-50 border-slate-204 text-slate-500"
            }`}
          >
            <span className="text-xs">Ekonomik</span>
            <span className="text-[8px] opacity-80 font-normal mt-0.5">En Ucuz / Tasarruf</span>
          </button>
          
          {/* Dengeli Mod */}
          <button
            onClick={() => handleLevelChange("Dengeli")}
            className={`py-2 px-1 text-center rounded-xl border flex flex-col items-center justify-center transition-all ${
              explanationLevel === "Dengeli"
                ? "bg-indigo-505 bg-indigo-500/10 border-indigo-500/50 text-indigo-430 font-bold"
                : isDarkMode ? "bg-black/20 border-white/5 text-gray-500" : "bg-slate-50 border-slate-204 text-slate-500"
            }`}
          >
            <span className="text-xs">Dengeli</span>
            <span className="text-[8px] opacity-80 font-normal mt-0.5">Hızlı & Kararlı</span>
          </button>

          {/* Kaliteli Mod */}
          <button
            onClick={() => handleLevelChange("Kaliteli")}
            className={`py-2 px-1 text-center rounded-xl border flex flex-col items-center justify-center transition-all ${
              explanationLevel === "Kaliteli"
                ? "bg-purple-505 bg-purple-500/10 border-purple-500/50 text-purple-430 font-bold"
                : isDarkMode ? "bg-black/20 border-white/5 text-gray-500" : "bg-slate-50 border-slate-204 text-slate-500"
            }`}
          >
            <span className="text-xs">Kaliteli</span>
            <span className="text-[8px] opacity-80 font-normal mt-0.5">Derin Analiz</span>
          </button>
        </div>

        {explanationLevel === "Ekonomik" && (
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[10px] leading-relaxed">
            🌿 <strong>Ekonomik Mod Aktif:</strong> Yanıt boyutları kısıtlanır, testler 5 soru olarak önerilir ve <strong>gemini-3.1-flash-lite</strong> modeli seçilerek yapay zeka masrafları %90 azaltılır.
          </div>
        )}

        {explanationLevel === "Dengeli" && (
          <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[10px] leading-relaxed">
            ⚡ <strong>Dengeli Mod Aktif:</strong> Makul uzunlukta net cevaplar üretilir. <strong>gemini-2.5-flash</strong> modeli kullanılarak hem hız hem de makul maliyet dengesi gözetilir.
          </div>
        )}

        {explanationLevel === "Kaliteli" && (
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-500 text-[10px] leading-relaxed flex flex-col gap-1">
            <div className="flex items-center gap-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>API Tüketim Uyarısı</span>
            </div>
            <span>Kaliteli Mod en güçlü yapay zeka modeli (<strong>gemini-1.5-pro</strong>) ile çalışır. Matematiksel ispatlar, karmaşık denklemler detaylı açıklanır ancak belirgin derecede daha yüksek API kotası ve maliyeti harcayabilir.</span>
          </div>
        )}
      </div>

      {/* 2. Model Selection Dropdown Section */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDarkMode ? "bg-[#0d1125]/60 border-white/5 shadow-inner" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
            Yapay Zeka Alternatif Model Motoru
          </h3>
          <span className="text-[10px] font-bold text-indigo-400 font-mono">Dynamic AI</span>
        </div>

        <select
          value={selectedModel}
          onChange={(e) => {
            setSelectedModel(e.target.value);
            if (e.target.value.includes("pro")) setExplanationLevel("Kaliteli");
            else if (e.target.value.includes("lite")) setExplanationLevel("Ekonomik");
            else setExplanationLevel("Dengeli");
          }}
          className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans transition-colors cursor-pointer ${
            isDarkMode ? "bg-black/40 border-white/10 text-gray-200" : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ekonomik / Hızlı - Varsayılan)</option>
          <option value="gemini-3.5-flash">gemini-3.5-flash (Akıllı & Dengeli - Önerilen)</option>
          <option value="gemini-2.5-flash">gemini-2.5-flash (Dengeli Mod Motoru)</option>
          <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Maksimum Kalite / Ağır Formüller)</option>
        </select>
        
        {/* Cost Reduction constraints toggle switch */}
        <div className="mt-3.5 flex items-center justify-between border-t border-gray-500/10 pt-3">
          <div>
            <div className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Cevap Boyutunu Sınırla</div>
            <p className="text-[9px] text-gray-500 mt-0.5">Maliyet azaltmak amacıyla cevaplar daha öz ve net tutulur.</p>
          </div>
          <button 
            onClick={() => setApiReductionMode(!apiReductionMode)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${
              apiReductionMode ? "bg-emerald-500" : "bg-gray-600"
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
              apiReductionMode ? "translate-x-4" : "translate-x-0"
            }`}></div>
          </button>
        </div>
      </div>

      {/* 3. Gemini API Key Input */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDarkMode ? "bg-[#0d1125]/60 border-white/5 shadow-inner" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Key className="w-4 h-4" />
          </div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            Gemini API Anahtarı
          </h3>
        </div>

        <p className={`text-xs mb-3.5 leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Kendi Google Gemini anahtarınızı ekleyerek limitlerden bağımsız, kesintisiz bir ders masası kurun.
        </p>

        <div className="relative flex items-center mb-3">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIzaSy..."
            className={`w-full py-2.5 pl-3.5 pr-11 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono transition-colors ${
              isDarkMode 
                ? "bg-black/40 border-white/10 text-gray-200 focus:border-indigo-500 placeholder-gray-600" 
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 placeholder-gray-400"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className={`absolute right-3 p-1 rounded-lg ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"}`}
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Status badges */}
        {apiKeyInput ? (
          <div className="flex items-center gap-1.5 text-[9.5px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg w-full justify-center mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Kişisel API Anahtarı Tanımlandı</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[9.5px] text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg w-full justify-center mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Varsayılan Sunucu API Kotaları Kullanılıyor</span>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all"
        >
          {savedSuccess ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span>Ayarlar Başarıyla Kaydedildi!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Değişiklikleri Kaydet</span>
            </>
          )}
        </button>
      </div>

      {/* 4. API Cost Indicator Dashboard Widget */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDarkMode ? "bg-gradient-to-br from-indigo-950/20 to-black/20 border-white/5 shadow-inner" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Coins className="w-4 h-4" />
          </div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            Bugünkü Yapay Zeka Harcaması
          </h3>
        </div>

        <p className={`text-[10px] leading-relaxed mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Sokrates'in önbellekleme ve akıllı parça eşleme algoritmaları sayesinde API maliyetlerini ne kadar kıstığınızı takip edin.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2 rounded-xl text-center border ${isDarkMode ? "bg-black/30 border-white/5" : "bg-slate-50 border-slate-100"}`}>
            <span className={`block text-xs font-bold ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>{stats.count}</span>
            <span className="text-[8px] text-gray-500 block mt-0.5">Sorgu Sayısı</span>
          </div>
          <div className={`p-2 rounded-xl text-center border ${isDarkMode ? "bg-black/30 border-white/5" : "bg-slate-50 border-slate-100"}`}>
            <span className={`block text-xs font-bold ${isDarkMode ? "text-gray-300" : "text-slate-700 font-mono"}`}>
              {stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : stats.totalTokens}
            </span>
            <span className="text-[8px] text-gray-500 block mt-0.5">Tahmini Token</span>
          </div>
          <div className={`p-2 rounded-xl text-center border ${isDarkMode ? "bg-[#0d2c20]/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"}`}>
            <span className="block text-xs font-black text-emerald-400">
              ${stats.estimatedCost.toFixed(5)}
            </span>
            <span className="text-[8px] text-emerald-500 block mt-0.5">Tahmini Maliyet</span>
          </div>
        </div>

        <div className="mt-3.5 text-[8.5px] leading-relaxed text-gray-500 text-center border-t border-gray-500/10 pt-3 flex gap-4 justify-between items-center">
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> Önbellekleme Tasarrufu: ~%85
          </span>
          <span>Sıfır Sunucu Yükü</span>
        </div>
      </div>

      {/* 5. Explainer Study Tone Mode Section */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDarkMode ? "bg-[#0d1125]/60 border-white/5" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <div className="flex items-center gap-2 mb-3.5">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <GraduationCap className="w-4 h-4" />
          </div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            Ders Anlatım Anlatı Tarzı
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Professional Selector */}
          <button
            onClick={() => setExplanationMode("professional")}
            className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all ${
              explanationMode === "professional"
                ? "bg-indigo-650 bg-indigo-500/10 border-indigo-500/60 ring-1 ring-indigo-500/30"
                : isDarkMode ? "bg-black/20 border-white/5 hover:bg-white/5" : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Profesyonel Akademik</span>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                explanationMode === "professional" ? "border-indigo-500 bg-indigo-500" : "border-gray-500"
              }`}>
                {explanationMode === "professional" && <div className="w-1 h-1 bg-white rounded-full"></div>}
              </div>
            </div>
            <p className={`text-[9.5px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Doğrudan ders kitabı tarzında, resmi analizler ve terimlerle dolu akademik dil.
            </p>
          </button>

          {/* Student Selector */}
          <button
            onClick={() => setExplanationMode("student")}
            className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all ${
              explanationMode === "student"
                ? "bg-indigo-650 bg-indigo-500/10 border-indigo-500/60 ring-1 ring-indigo-500/30"
                : isDarkMode ? "bg-black/20 border-white/5 hover:bg-white/5" : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Eğlenceli Öğrenci Dili</span>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                explanationMode === "student" ? "border-indigo-500 bg-indigo-500" : "border-gray-500"
              }`}>
                {explanationMode === "student" && <div className="w-1 h-1 bg-white rounded-full"></div>}
              </div>
            </div>
            <p className={`text-[9.5px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Sıcak analojiler, gerçek hayattan basit benzetmeler ve esprili öğrenci tarzı çalışma dili.
            </p>
          </button>

          {/* Simple Selector */}
          <button
            onClick={() => setExplanationMode("simple")}
            className={`p-3 rounded-xl text-left border flex flex-col gap-1 transition-all ${
              explanationMode === "simple"
                ? "bg-indigo-650 bg-indigo-500/10 border-indigo-500/60 ring-1 ring-indigo-500/30"
                : isDarkMode ? "bg-black/20 border-white/5 hover:bg-white/5" : "bg-slate-50 border-slate-200 hover:bg-slate-100/60"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Çok Basit (10 Yaş Anlatımı)</span>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                explanationMode === "simple" ? "border-indigo-500 bg-indigo-500" : "border-gray-500"
              }`}>
                {explanationMode === "simple" && <div className="w-1 h-1 bg-white rounded-full"></div>}
              </div>
            </div>
            <p className={`text-[9.5px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Yormayan, son derece berrak ve teknik detayları en taban düzeyde anlatan sade üslup.
            </p>
          </button>
        </div>
      </div>

      {/* 6. Preferences */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDarkMode ? "bg-[#0d1125]/60 border-white/5" : "bg-white border-slate-200/80 shadow-sm"
      }`}>
        <div className="flex items-center gap-2 mb-3.5">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Layout className="w-4 h-4" />
          </div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            Sistem Bilgileri
          </h3>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-gray-500/10">
            <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Bölge / Dil</span>
            <span className="font-semibold text-indigo-400 flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" />
              Türkiye / Türkçe
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-gray-500/10">
            <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Veritabanı Yapısı</span>
            <span className="font-semibold text-emerald-400">SQLite (Indexed-Caches)</span>
          </div>
        </div>

        <button
          onClick={onClearCache}
          className="mt-4 w-full py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/5 text-red-500 font-bold text-xs cursor-pointer active:scale-95 transition-all"
        >
          Tüm Önbellek & Sınav Geçmişini Sıfırla
        </button>
      </div>
    </div>
  );
}
