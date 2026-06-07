import React, { useState, useEffect, useMemo } from "react";
import {
  Brain,
  Plus,
  Trash2,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  Sparkles,
  HelpCircle,
  Bookmark,
  ChevronDown,
  X,
  RefreshCw,
  Award,
  AlertTriangle,
  Lightbulb,
  FileText,
  ThumbsUp,
  Info
} from "lucide-react";
import { db } from "../services/databaseService";
import { gemini } from "../services/geminiService";
import { DB_Subject, DB_Topic, DB_Mistake } from "../types";

export default function MistakeAnalysisScreen() {
  const [mistakes, setMistakes] = useState<DB_Mistake[]>([]);
  const [subjects, setSubjects] = useState<DB_Subject[]>([]);
  const [topics, setTopics] = useState<DB_Topic[]>([]);
  
  // Dashboard Metrics
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    carelessness: 0,
    knowledgeGap: 0,
    misreading: 0,
    timePressure: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "resolved" | "unresolved"

  // Modal creation states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [userIncorrectAnswer, setUserIncorrectAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [mistakeType, setMistakeType] = useState<DB_Mistake["mistake_type"]>("knowledge_gap");
  
  // Custom manual or AI analysis states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Selected mistake details modal/panel
  const [activeMistakeDetail, setActiveMistakeDetail] = useState<DB_Mistake | null>(null);

  // Load screen data
  useEffect(() => {
    setSubjects(db.getSubjects());
    loadMistakes();
  }, []);

  // Set topic listings when a subject is chosen in form
  useEffect(() => {
    if (selectedSubjectId) {
      setTopics(db.getTopics(selectedSubjectId));
      setSelectedTopicId("");
    } else {
      setTopics([]);
      setSelectedTopicId("");
    }
  }, [selectedSubjectId]);

  const loadMistakes = () => {
    const list = db.getMistakes();
    setMistakes(list);

    // Calculate metrics
    const totalCount = list.length;
    const resolvedCount = list.filter(m => m.is_resolved).length;
    const carelessnessCount = list.filter(m => m.mistake_type === "carelessness").length;
    const knowledgeCount = list.filter(m => m.mistake_type === "knowledge_gap").length;
    const misreadCount = list.filter(m => m.mistake_type === "misreading").length;
    const timeCount = list.filter(m => m.mistake_type === "time_pressure").length;

    setStats({
      total: totalCount,
      resolved: resolvedCount,
      carelessness: carelessnessCount,
      knowledgeGap: knowledgeCount,
      misreading: misreadCount,
      timePressure: timeCount
    });
  };

  // Add a new mistake with optional AI review trigger
  const handleCreateMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !selectedSubjectId) {
      alert("Lütfen ders seçin ve soru açıklamasını yazın.");
      return;
    }

    const mistakeId = "mistake_" + Math.random().toString(36).substring(2, 11);
    setIsAiLoading(true);
    setAiError(null);

    let finalAnalysis = "";
    let finalStrategy = "";

    try {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      const subjectName = subject ? subject.name : "Genel Ders";
      
      // Attempt to hit Gemini API
      const response = await gemini.analyzeMistake(
        subjectName,
        questionText.trim(),
        userIncorrectAnswer.trim(),
        correctAnswer.trim(),
        mistakeType
      );

      if (response && response.includes("---")) {
        const parts = response.split("---");
        finalAnalysis = parts[0]?.trim();
        finalStrategy = parts[1]?.trim();
      } else {
        finalAnalysis = response || "Eğim analiz tespiti tamamlandı.";
        finalStrategy = "Bu hatayı yapmamak için soruyu sakin okuyun.";
      }
    } catch (err: any) {
      console.warn("Gemini API could not generate mistake analysis. Falling back to local template solver:", err);
      // Fallback local solver base
      const localAnalysisMap: Record<string, { analysis: string; strategy: string }> = {
        carelessness: {
          analysis: "Hızlı çözme arzusu ve sınav stresi nedeniyle ufak ama can yakan bir ayrıntıyı atladınız. İşlem hatası veya işaret hatası yapılmış olabilir.",
          strategy: "Her adımdan sonra elde ettiğiniz değeri 1 saniye duraklayarak kontrol edin. Temel aritmetik işlemleri kafadan yapmak yerine mutlaka kağıda küçük notlar alın."
        },
        knowledge_gap: {
          analysis: "Konudaki teorik altyapıda veya kazanım kurallarında bir eksiklik göze çarpıyor. Formülü veya tanımı tam hatırlayamadığınız için yorum satırınız tıkandı.",
          strategy: "Konu özetlerini açıp bu formülün/ispatın üzerine en az 5 adet pekiştirme sorusu çözün. Formülleri renkli kağıtlara yazarak ders masanıza yapıştırın!"
        },
        misreading: {
          analysis: "Soru kökünün altı çizili olan 'değildir, olamaz, savunulamaz' gibi olumsuz ekleri gözden kaçırıp sorunun olumlu bittiğini sandınız.",
          strategy: "Her soruda soru kökündeki can alıcı kelimeyi (değildir, mutlaka, kesinlikle vb.) kurşun kalemle kocaman bir yuvarlak içerisine alın."
        },
        time_pressure: {
          analysis: "Soruyu çözerken sürenin bittiğini hissettiğiniz için panikleyip odaklanma kalitenizi kaybettiniz. Süre yönetimi yetersiz kaldı.",
          strategy: "Turlama tekniğini uygulayın. İlk bakışta çözümü 1 dakikayı aşacak soruların yanına bir işaret koyup es geçin, sona saklayın."
        },
        unknown: {
          analysis: "Soru tarzının farklılığından ötürü kurguyu anlamakta güçlük çektiniz ve ne yapacağınızı kestiremediniz.",
          strategy: "Benzer çıkmış ÖSYM sorularını analiz edin ve çözüm videolarını dinleyerek soru mantığını tamamen sindirin."
        }
      };

      const selectedTypeStr = mistakeType as string;
      finalAnalysis = localAnalysisMap[selectedTypeStr]?.analysis || localAnalysisMap.unknown.analysis;
      finalStrategy = localAnalysisMap[selectedTypeStr]?.strategy || localAnalysisMap.unknown.strategy;
    } finally {
      setIsAiLoading(false);
    }

    const newMistake: DB_Mistake = {
      id: mistakeId,
      subject_id: selectedSubjectId,
      topic_id: selectedTopicId || undefined,
      question_text: questionText.trim(),
      user_answer: userIncorrectAnswer.trim() || undefined,
      correct_answer: correctAnswer.trim() || undefined,
      mistake_type: mistakeType,
      analysis_text: finalAnalysis,
      solution_strategy: finalStrategy,
      is_resolved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.addMistake(newMistake);
    
    // Reset Form
    setQuestionText("");
    setUserIncorrectAnswer("");
    setCorrectAnswer("");
    setSelectedSubjectId("");
    setSelectedTopicId("");
    setMistakeType("knowledge_gap");
    
    setShowAddModal(false);
    loadMistakes();
    alert("Hatalı soru kaydı ve yapay zeka söküm analizi başarıyla deftere eklendi! 📚✍️");
  };

  // Toggle a mistake as resolved (mastered) to earn XP points!
  const handleResolveToggle = (mistakeId: string) => {
    const list = db.getMistakes();
    const item = list.find(m => m.id === mistakeId);
    if (item) {
      const updated = {
        ...item,
        is_resolved: !item.is_resolved,
        updated_at: new Date().toISOString()
      };
      db.updateMistake(updated);
      loadMistakes();
      
      // Update active detail modal state if active
      if (activeMistakeDetail?.id === mistakeId) {
        setActiveMistakeDetail(updated);
      }

      if (!item.is_resolved) {
        alert("Harika! Bu konudaki yanılgıyı aşmış ve hatanı düzeltmiş bulunuyorsun! 🎉 +15 Zeka Puanı (XP) ve özgüven hanene eklendi.");
      }
    }
  };

  const handleDeleteMistake = (mistakeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bu hatalı soru girdisini defterden tamamen silmek istediğinize emin misiniz?")) {
      db.deleteMistake(mistakeId);
      if (activeMistakeDetail?.id === mistakeId) {
        setActiveMistakeDetail(null);
      }
      loadMistakes();
    }
  };

  // Filter mistakes list
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      // Search
      const textMatch = searchQuery === "" || 
        m.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.analysis_text && m.analysis_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.solution_strategy && m.solution_strategy.toLowerCase().includes(searchQuery.toLowerCase()));

      // Subject Filter
      const subjectMatch = selectedSubjectFilter === "all" || m.subject_id === selectedSubjectFilter;

      // Type Filter
      const typeMatch = typeFilter === "all" || m.mistake_type === typeFilter;

      // Status Filter
      const statusMatch = statusFilter === "all" ||
        (statusFilter === "resolved" && m.is_resolved) ||
        (statusFilter === "unresolved" && !m.is_resolved);

      return textMatch && subjectMatch && typeMatch && statusMatch;
    });
  }, [mistakes, searchQuery, selectedSubjectFilter, typeFilter, statusFilter]);

  // Translate labels for mistake types
  const getMistakeTypeLabel = (type: string) => {
    switch (type) {
      case "carelessness":
        return "Dikkat Dağınıklığı";
      case "knowledge_gap":
        return "Bilgi Eksikliği / Konu Eksiği";
      case "misreading":
        return "Soru Kökünü Yanlış Okuma";
      case "time_pressure":
        return "Zaman Baskısı / Yetiştirememe";
      default:
        return "Kurgu / Analiz Hatası";
    }
  };

  const getMistakeTypeColor = (type: string) => {
    switch (type) {
      case "carelessness":
        return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" };
      case "knowledge_gap":
        return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" };
      case "misreading":
        return { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" };
      case "time_pressure":
        return { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" };
      default:
        return { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" };
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-transparent p-4 overflow-y-auto">
      
      {/* 1. Header Banner Dashboard */}
      <div className="bg-slate-900/60 border border-white/5 rounded-[24px] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/10 border border-indigo-500/30 text-[10px] text-indigo-350 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Sokratik Hata Analiz Laboratuvarı
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-1 leading-none">
              Soru-Cevap & Yanlış Analiz Defteri
            </h1>
            <p className="text-xs text-gray-400 mt-1.5">
              Yanlış yaptığın YKS/AYT sorularını ekle, bilişsel sebeplerini sınıflandır ve Gemini Sokratik analiz tüyolarını topla!
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-505 hover:to-violet-505 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-650/15 active:scale-95 transition-all cursor-pointer self-stretch md:self-auto"
        >
          <Plus className="w-4 h-4" /> Yeni Yanlış Soru Ekle
        </button>
      </div>

      {/* 2. STATS METRICS BENTO SCORER BOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        
        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 font-extrabold uppercase font-mono tracking-wider">Kayıtlı Yanlış</span>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <h2 className="text-2xl font-black text-white font-mono">{stats.total}</h2>
            <span className="text-[10px] text-gray-400">girdi</span>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/15 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-emerald-500 font-extrabold uppercase font-mono tracking-wider">Kazanılan Hata</span>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <h2 className="text-2xl font-black text-emerald-400 font-mono">{stats.resolved}</h2>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">
              {stats.total > 0 ? `%${Math.round((stats.resolved / stats.total) * 100)}` : "%0"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-amber-500 font-extrabold uppercase font-mono tracking-wider">Dikkat Kaybı</span>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <h2 className="text-2xl font-black text-amber-500 font-mono">{stats.carelessness}</h2>
            <span className="text-[10px] text-gray-500">adet</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-red-500 font-extrabold uppercase font-mono tracking-wider">Bilgi Eksiği</span>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <h2 className="text-2xl font-black text-red-500 font-mono">{stats.knowledgeGap}</h2>
            <span className="text-[10px] text-gray-500">adet</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-sky-500 font-extrabold uppercase font-mono tracking-wider">Okuma Hatası</span>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <h2 className="text-2xl font-black text-sky-500 font-mono">{stats.misreading}</h2>
            <span className="text-[10px] text-gray-500">adet</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-violet-500 font-extrabold uppercase font-mono tracking-wider">Zaman Süresi</span>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <h2 className="text-2xl font-black text-violet-500 font-mono">{stats.timePressure}</h2>
            <span className="text-[10px] text-gray-500">adet</span>
          </div>
        </div>

      </div>

      {/* 3. SEARCH AND FILTERS LAYER */}
      <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center mb-4">
        
        {/* Search Input bar */}
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Sorularda, formüllerde veya yapay zeka tüyolarında ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/70 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Course options filter */}
        <div className="flex flex-wrap md:flex-nowrap gap-2 items-center w-full md:w-auto">
          
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 select-none cursor-pointer flex-1 md:flex-initial"
          >
            <option value="all">📂 Tüm Dersler</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                📖 {s.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 select-none cursor-pointer flex-1 md:flex-initial"
          >
            <option value="all">🧠 Tüm Hata Grupları</option>
            <option value="knowledge_gap">🧱 Bilgi / Eksik Konu</option>
            <option value="carelessness">⚡ Dikkat Dağınıklığı</option>
            <option value="misreading">📜 Soru Kökü Okuması</option>
            <option value="time_pressure">⏱ Zaman / Dakika Telaşı</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 select-none cursor-pointer flex-1 md:flex-initial"
          >
            <option value="all">📌 Tüm Durumlar</option>
            <option value="unresolved">⏳ Çözülmemiş / İncelemede</option>
            <option value="resolved">🎯 Başarıyla Çözülenler</option>
          </select>

        </div>

      </div>

      {/* 4. CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {filteredMistakes.map(m => {
          const subject = subjects.find(s => s.id === m.subject_id);
          const typeStyle = getMistakeTypeColor(m.mistake_type);
          
          return (
            <div
              key={m.id}
              onClick={() => setActiveMistakeDetail(m)}
              className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer hover:scale-101 hover:shadow-lg ${
                m.is_resolved 
                  ? "bg-emerald-950/20 border-emerald-500/20 shadow-emerald-950/5"
                  : "bg-slate-900/50 border-white/5 hover:border-indigo-500/30"
              }`}
            >
              {/* Ribbon status indicator */}
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border tracking-wider font-mono ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                    {getMistakeTypeLabel(m.mistake_type)}
                  </span>
                  
                  {subject && (
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                      📚 {subject.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolveToggle(m.id);
                    }}
                    className={`p-1 rounded-lg transition-all ${
                      m.is_resolved
                        ? "text-emerald-400 bg-emerald-500/15 border border-emerald-400/20"
                        : "text-gray-500 hover:text-white bg-slate-950/80 hover:bg-slate-800"
                    }`}
                    title={m.is_resolved ? "Çözülmedi olarak işaretle" : "Bu hatayı tamamen çözdüm/kavradım!"}
                  >
                    <CheckCircle className="w-4 h-4 fill-current opacity-85" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteMistake(m.id, e)}
                    className="p-1 text-gray-500 hover:text-red-400 bg-slate-950/80 hover:bg-red-950/20 rounded-lg transition-all"
                    title="Bu hatayı sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text block */}
              <div className="my-4">
                <p className="text-gray-450 text-[10px] font-semibold uppercase tracking-wider font-mono mb-1">Hatalı Soru / Husus:</p>
                <p className="text-xs font-bold font-sans text-white leading-relaxed line-clamp-3">
                  {m.question_text}
                </p>

                {m.user_answer && (
                  <div className="mt-2 text-[11px] leading-relaxed">
                    <span className="text-red-400 font-bold">Yapılan Yanlış Cevap:</span>{" "}
                    <span className="text-gray-300 italic">"{m.user_answer}"</span>
                  </div>
                )}
              </div>

              {/* Micro Socratic Preview tip */}
              {m.solution_strategy && (
                <div className="p-3 bg-indigo-950/15 border border-indigo-500/10 rounded-2xl flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-indigo-200">
                    <span className="font-bold text-amber-400 block mb-0.5">Sokratik Strateji / Püf Noktası:</span>
                    <p className="line-clamp-2 italic">"{m.solution_strategy}"</p>
                  </div>
                </div>
              )}

              {/* Click instruction */}
              <div className="text-[10px] text-gray-500 text-right mt-3 font-semibold hover:text-indigo-400">
                Detayları ve Gemini Koç Analizini Görmek İçin Tıkla ➔
              </div>
              
            </div>
          );
        })}

        {filteredMistakes.length === 0 && (
          <div className="col-span-full border border-dashed border-white/5 rounded-3xl bg-slate-900/10 p-10 text-center">
            <Info className="w-8 h-8 text-indigo-400 mx-auto opacity-70 animate-bounce" />
            <span className="text-sm font-black text-white block mt-3">Yeni bir Yanlış Soru ekleyin!</span>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-2.5">
              Tüm YKS şampiyonları yanlışlarından öğrenir. Deneme sınavlarında veya testlerde yaptığın hataları bu deftere ekle ve Gemini ile söküp at!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              + Deftere İlk Yanlışını Ekle
            </button>
          </div>
        )}

      </div>


      {/* ==========================================
          5. DETAILED MISTAKE BOTTOM MODAL/PANEL (ACTIVE VIEW)
          ========================================== */}
      {activeMistakeDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-text">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Sokratik Hata Söküm Dosyası
                </h3>
              </div>
              
              <button
                onClick={() => setActiveMistakeDetail(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Core Card Info */}
            <div className="space-y-4">
              
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border font-mono tracking-wider ${getMistakeTypeColor(activeMistakeDetail.mistake_type).bg} ${getMistakeTypeColor(activeMistakeDetail.mistake_type).text} ${getMistakeTypeColor(activeMistakeDetail.mistake_type).border}`}>
                  {getMistakeTypeLabel(activeMistakeDetail.mistake_type)}
                </span>
                
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                  Ders: {subjects.find(s => s.id === activeMistakeDetail.subject_id)?.name || "Genel Ders"}
                </span>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                  activeMistakeDetail.is_resolved 
                    ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/15 border-red-500/20 text-red-400"
                }`}>
                  Durum: {activeMistakeDetail.is_resolved ? "✓ Çözüldü / Hatadan Ders Alındı!" : "⏳ Çözülmesi Bekleniyor"}
                </span>
              </div>

              {/* Question Text */}
              <div className="bg-slate-950 p-4 border border-white/5 rounded-2xl">
                <span className="text-[9px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block mb-1">MOCK / DENEME SORUSU</span>
                <p className="text-xs text-white leading-relaxed font-semibold font-sans select-all whitespace-pre-wrap">
                  {activeMistakeDetail.question_text}
                </p>
              </div>

              {/* Answers Grid */}
              <div className="grid grid-cols-2 gap-3">
                
                {activeMistakeDetail.user_answer && (
                  <div className="bg-red-500/5 border border-red-500/15 p-3 rounded-2xl">
                    <span className="text-[9px] text-red-400 font-extrabold uppercase font-mono tracking-wider block mb-0.5">Yaptığınız Yanlış</span>
                    <p className="text-xs text-gray-350 italic">
                      "{activeMistakeDetail.user_answer}"
                    </p>
                  </div>
                )}

                {activeMistakeDetail.correct_answer && (
                  <div className="bg-emerald-500/5 bottom border-emerald-500/15 p-3 rounded-2xl">
                    <span className="text-[9px] text-emerald-400 font-extrabold uppercase font-mono tracking-wider block mb-0.5">Doğru Cevap / Çözüm</span>
                    <p className="text-xs text-emerald-100 font-bold">
                      "{activeMistakeDetail.correct_answer}"
                    </p>
                  </div>
                )}

              </div>

              {/* Socratic analysis feedback blocks */}
              {activeMistakeDetail.analysis_text && (
                <div className="p-4 bg-indigo-950/10 border border-indigo-500/10 rounded-2xl flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                    Σ
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider font-mono">
                      Sokratik Bilişsel Hata Analizi:
                    </span>
                    <p className="text-[11px] leading-relaxed text-gray-200 whitespace-pre-wrap">
                      {activeMistakeDetail.analysis_text}
                    </p>
                  </div>
                </div>
              )}

              {activeMistakeDetail.solution_strategy && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    💡
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider font-mono">
                      YKS Sınav Stratejisi & Odak Tüyosu:
                    </span>
                    <p className="text-[11px] leading-relaxed text-amber-100 whitespace-pre-wrap">
                      {activeMistakeDetail.solution_strategy}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/5 mt-4">
                
                <button
                  onClick={() => handleResolveToggle(activeMistakeDetail.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                    activeMistakeDetail.is_resolved
                      ? "bg-slate-950 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white"
                      : "bg-emerald-500 hover:bg-emerald-450 text-slate-950"
                  }`}
                >
                  <CheckCircle className="w-4 h-4 fill-current text-current" />
                  <span>
                    {activeMistakeDetail.is_resolved ? "Çözülmedi Olarak İşaretle ↩" : "Hatamı Çözdüm / Kazandım! 🎯"}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    handleDeleteMistake(activeMistakeDetail.id, e);
                  }}
                  className="px-4 py-2.5 bg-red-650/30 hover:bg-red-650/50 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Defterden Sil
                </button>

              </div>

            </div>

          </div>
        </div>
      )}


      {/* ==========================================
          6. ADD NEW MISTAKE POPUP WITH AI REVIEW TRIGGER
          ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-text">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Header bar */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Yeni Hatalı Soru Kaydedici
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMistake} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Hangi Dersten Yanlış Yaptın?</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 select-none cursor-pointer"
                    required
                  >
                    <option value="">-- Ders Seçin --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.exam_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Alt Kazanım Konusu (Opsiyonel)</label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 select-none cursor-pointer disabled:opacity-40"
                    disabled={!selectedSubjectId}
                  >
                    <option value="">-- Konu Seçin --</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Hatanın Bilişsel Sebebi (Nasıl Yanıldın?)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "knowledge_gap", label: "🧱 Bilgi / Formül Eksiği" },
                    { key: "carelessness", label: "⚡ Dikkat Dağınıklığı / İşlem" },
                    { key: "misreading", label: "📜 Soru Kökü Okuma Hatası" },
                    { key: "time_pressure", label: "⏱ Zaman Baskısı" }
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMistakeType(item.key as any)}
                      className={`p-2.5 rounded-xl text-left text-xs border transition-all cursor-pointer ${
                        mistakeType === item.key
                          ? "bg-indigo-650 border-indigo-500 text-white font-bold"
                          : "bg-slate-950 border-white/5 text-gray-400 hover:bg-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Soru Metni / Detaylı Sorunun İfadesi</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Denemede veya testte çıkan soruyu, şeklini veya kurgusunu buraya detaylıca yazın..."
                  className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Verdiğiniz Yanlış Cevap (Opsiyonel)</label>
                  <input
                    type="text"
                    value={userIncorrectAnswer}
                    onChange={(e) => setUserIncorrectAnswer(e.target.value)}
                    placeholder="Örn: Limit tanımsızdır dedim"
                    className="w-full bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Sorunun Gerçek Doğru Cevabı (Opsiyonel)</label>
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Örn: 0 / Sadeleşince çarpan kalır"
                    className="w-full bg-slate-950 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-indigo-950/10 border border-indigo-500/10 p-3.5 rounded-2xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-[11px] leading-relaxed text-indigo-250">
                  <span className="font-bold text-white">Gemini Sokratik Süzgeci Aktif!</span>
                  <p className="text-gray-400 mt-0.5">
                    "Kaydet" butonuna bastığınızda, Gemini yapay zekası soruyu analiz edecek, bilişsel zafiyetinizi saptayacak ve size özel bir çözüm stratejisi sentezleyecektir.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                  disabled={isAiLoading}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  disabled={isAiLoading}
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sokratik Analiz Üretiliyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Analiz Et & Deftere Kaydet</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
