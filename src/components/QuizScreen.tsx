import React, { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Share2, 
  BookOpen, 
  History,
  Award,
  HelpCircle,
  AlertCircle,
  Compass,
  Sliders,
  Sparkles,
  Layers,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Database
} from "lucide-react";
import db from "../services/databaseService";

interface Question {
  id: number;
  lesson: string;
  topic: string;
  question: string;
  options: string[]; // e.g. ["A) ...", "B) ...", "C) ...", "D) ..."]
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation: string;
  difficulty: string;
}

const CONST_OFFLINE_QUESTIONS: Question[] = [
  {
    id: 1,
    lesson: "Tarih",
    topic: "Osmanlı Devleti’nde Divan Teşkilatı",
    question: "Osmanlı Devleti’nde padişah adına tuğra çeken, fethedilen toprakların kayıtlarını tutan divan üyesi kimdir?",
    options: [
      "A) Nişancı",
      "B) Defterdar",
      "C) Sadrazam",
      "D) Kazasker"
    ],
    correctAnswer: "A",
    explanation: "Nişancı, padişahın tuğrasını çekmek (imzalamak) ve yeni fethedilen toprakları 'Tahrir Defterleri'ne kaydederek tapu kadastro işlemlerini yürütmekle görevli divan üyesidir.",
    difficulty: "Orta"
  },
  {
    id: 2,
    lesson: "Tarih",
    topic: "Osmanlı Kuruluş Dönemi",
    question: "Osmanlı Devleti'nin ilk bakır parası (Mangır) hangi padişah döneminde bastırılmıştır?",
    options: [
      "A) Osman Bey",
      "B) Orhan Bey",
      "C) I. Murad",
      "D) Yıldırım Bayezid"
    ],
    correctAnswer: "A",
    explanation: "Osmanlı Devleti'nda ilk bakır para (Mangır) Osman Bey döneminde basılmıştır. İlk gümüş para (Akçe) ise Orhan Bey döneminde basılmıştır.",
    difficulty: "Kolay"
  },
  {
    id: 3,
    lesson: "Tarih",
    topic: "Osmanlı Gerileme Dönemi",
    question: "Coğrafi keşiflerin olumsuz etkilerinden kurtulmak amacıyla Osmanlı Devleti ve Fransa arasında imzalanan, Fransız tüccarlara ticari ayrıcalıklar tanıyan anlaşma hangisidir?",
    options: [
      "A) Karlofça Anlaşması",
      "B) Amasya Anlaşması",
      "C) Kapitülasyonlar (Ahd-i Atik)",
      "D) Belgrad Anlaşması"
    ],
    correctAnswer: "C",
    explanation: "Kanuni Sultan Süleyman döneminde Fransa'ya verilen kapitülasyonlar (Ahd-i Atik) sayesinde Akdeniz ticaretinin canlandırılması ve Avrupa Hristiyan birliğinin parçalanması amaçlanmıştır.",
    difficulty: "Orta"
  },
  {
    id: 4,
    lesson: "Tarih",
    topic: "Osmanlı Klasik Dönem Kültür",
    question: "Fatih Sultan Mehmet döneminde açılan ve Osmanlı Devleti'nin en üst düzey eğitim kurumu kabul edilen medrese hangisidir?",
    options: [
      "A) Süleymaniye Medresesi",
      "B) Sahn-ı Seman Medresesi",
      "C) Nizamiye Medresesi",
      "D) İznik Orhaniyesi"
    ],
    correctAnswer: "B",
    explanation: "Sahn-ı Seman Medresesi, İstanbul'un fethinden sonra Fatih Sultan Mehmet tarafından inşa ettirilmiş olan ve üst kuruluş düzeyinde eğitim veren en köklü eğitim kurumudur.",
    difficulty: "Zor"
  },
  {
    id: 5,
    lesson: "Tarih",
    topic: "Osmanlı Yenileşme Dönemi",
    question: "Yeniçeri Ocağı'nı kaldırarak (Vaka-i Hayriye) yerine 'Asakir-i Mansure-i Muhammediye' adında modern bir ordu kuran Osmanlı padişahı kimdir?",
    options: [
      "A) III. Selim",
      "B) II. Mahmud",
      "C) Abdülmecid",
      "D) II. Abdülhamid"
    ],
    correctAnswer: "B",
    explanation: "II. Mahmud, 1826 yılında devlete zarar vermeye başlayan ve yeniliklerin önünü tıkayan Yeniçeri Ocağı'nı kaldırmıştır. Tarihte bu olaya 'Hayırlı Olay' (Vaka-i Hayriye) adı verilir.",
    difficulty: "Orta"
  },
  {
    id: 6,
    lesson: "Tarih",
    topic: "Osmanlı Anayasal Gelişmeler",
    question: "Osmanlı Devleti'nde 1876 yılında ilan edilen, Türk tarihinin ilk anayasası olma özelliğini taşıyan belge hangisidir?",
    options: [
      "A) Tanzimat Fermanı",
      "B) Islahat Fermanı",
      "C) Kanun-ı Esasi",
      "D) Sened-i İttifak"
    ],
    correctAnswer: "C",
    explanation: "1876 yılında ilan edilen Kanun-ı Esasi, Osmanlı Devleti'nin ve dolayısıyla Türk tarihinin ilk anayasasıdır. Meşrutiyet yönetimine geçişi sağlamıştır.",
    difficulty: "Kolay"
  },
  {
    id: 7,
    lesson: "Tarih",
    topic: "Osmanlı Dağılma Dönemi",
    question: "I. Balkan Savaşı sonrasında Osmanlı Devleti ile Balkan devletleri arasında imzalanan ve Osmanlı'nın Midye-Enez hattının batısındaki topraklarını kaybettiği anlaşma hangisidir?",
    options: [
      "A) Londra Anlaşması",
      "B) Bükreş Anlaşması",
      "C) Atina Anlaşması",
      "D) Berlin Anlaşması"
    ],
    correctAnswer: "A",
    explanation: "1913 Londra Anlaşması ile I. Balkan Savaşı sona ermiş ve Osmanlı Devleti, Midye-Enez hattının batısındaki Trakya topraklarını (Edirne dahil) kaybetmiştir.",
    difficulty: "Zor"
  },
  {
    id: 8,
    lesson: "Tarih",
    topic: "Osmanlı Eyalet Teşkilatı",
    question: "Osmanlı Devleti’nde eyaletlerde asayişi ve güvenliği sağlamakla görevli, askeri yönetim yetkilisi taşıyan sınıf hangisidir?",
    options: [
      "A) Muhtesip",
      "B) Subaşı",
      "C) Mültezim",
      "D) Sipahi"
    ],
    correctAnswer: "B",
    explanation: "Subaşılar, eyalet ve sancaklarda emniyet ve iç güvenlik işlerinden sorumlu komutanlardır.",
    difficulty: "Orta"
  },
  {
    id: 9,
    lesson: "Tarih",
    topic: "Osmanlı İlmiye Sınıfı",
    question: "Osmanlı Devleti'nde padişahın iradesini kesinleştiren, kanunların dine uygunluğunu denetleyerek fetva verme yetkisine sahip olan İlmiye sınıfı lideri kimdir?",
    options: [
      "A) Şeyhülislam",
      "B) Sadrazam",
      "C) Reisülküttab",
      "D) Kazasker"
    ],
    correctAnswer: "A",
    explanation: "Şeyhülislam, devlet işlerinin ve kanunların dine uygunluğunu onaylayan (fetva veren) en önemli dini ve ilmiye makamının lideridir.",
    difficulty: "Kolay"
  },
  {
    id: 10,
    lesson: "Tarih",
    topic: "Osmanlı Gerileme Dönemi",
    question: "Osmanlı Devleti, hangi anlaşma sonucunda tarihinde ilk kez 'Kırım'ın bağımsızlığını' kabul etmek zorunda kalmıştır?",
    options: [
      "A) Küçük Kaynarca Anlaşması",
      "B) Yaş Anlaşması",
      "C) Prut Anlaşması",
      "D) Karlofça Anlaşması"
    ],
    correctAnswer: "A",
    explanation: "1774 Küçük Kaynarca Anlaşması ile Kırım bağımsız devlet olmuş ve Osmanlı ilk defa halkı tamamen Müslüman/Türk olan önemli bir toprak parçasını kaybetmiştir.",
    difficulty: "Zor"
  }
];

interface CustomQuizRecord {
  id: string;
  lesson: string;
  topic: string;
  count: number;
  correct: number;
  wrong: number;
  percentage: number;
  date: string;
  difficulty: string;
  type: string;
  questions: Question[];
  userAnswers: Record<number, string>;
}

interface QuizScreenProps {
  isDarkMode: boolean;
}

export default function QuizScreen({ isDarkMode }: QuizScreenProps) {
  // Navigation tabs: 'create' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<"create" | "history">("create");
  
  // Game state: 'welcome' | 'playing' | 'results' | 'history_review'
  const [gameState, setGameState] = useState<"welcome" | "playing" | "results" | "history_review">("welcome");
  
  // Form fields for Custom Quiz Generation
  const [selectedLesson, setSelectedLesson] = useState<string>("Tarih");
  const [topicInput, setTopicInput] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficultySetting, setDifficultySetting] = useState<string>("Orta");
  const [questionStyle, setQuestionStyle] = useState<string>("KPSS tarzı");
  
  // Loading & Generating questions states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Active quiz state
  const [activeQuestionsList, setActiveQuestionsList] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // index -> letter answer "A","B" etc.
  
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Persistence States for completed custom quizzes
  const [pastQuizzes, setPastQuizzes] = useState<CustomQuizRecord[]>([]);
  const [selectedPastQuiz, setSelectedPastQuiz] = useState<CustomQuizRecord | null>(null);
  const [showWrongOnlyInReview, setShowWrongOnlyInReview] = useState<boolean>(false);

  // Seed / Load custom quizzes from localStorage on boot
  useEffect(() => {
    loadReviewsFromLocalStorage();
  }, []);

  const loadReviewsFromLocalStorage = () => {
    const listJson = localStorage.getItem("sokrates_custom_quizzes_history");
    if (listJson) {
      try {
        setPastQuizzes(JSON.parse(listJson));
      } catch (err) {
        console.error("Quiz history load error:", err);
      }
    }
  };

  // Preloaded original offline Osmaly history quiz
  const handleStartOfflineQuiz = () => {
    setActiveQuestionsList(CONST_OFFLINE_QUESTIONS);
    setCurrentIdx(0);
    setUserAnswers({});
    setCorrectCount(0);
    setWrongCount(0);
    setShowExplanation(false);
    setGameState("playing");
  };

  // Select option logic
  const handleSelectOption = (letter: string) => {
    if (userAnswers[currentIdx] !== undefined) return; // Disallow double voting
    
    const correctLetter = activeQuestionsList[currentIdx].correctAnswer;
    const isCorrect = letter === correctLetter;

    setUserAnswers(prev => ({ ...prev, [currentIdx]: letter }));
    setShowExplanation(true);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setWrongCount(prev => prev + 1);
    }
  };

  // Next Question logic
  const handleNext = () => {
    if (currentIdx < activeQuestionsList.length - 1) {
      setCurrentIdx(prev => prev + 1);
      // If next question is already answered (while navigating back and forth) show definition immediately
      setShowExplanation(userAnswers[currentIdx + 1] !== undefined);
    } else {
      // Compiled Stats
      const pct = Math.round((correctCount / activeQuestionsList.length) * 100);
      const now = new Date();
      const stringifiedDate = now.toLocaleDateString("tr-TR") + " " + now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

      const newRecord: CustomQuizRecord = {
        id: "quiz_" + Date.now(),
        lesson: activeQuestionsList[0]?.lesson || selectedLesson,
        topic: activeQuestionsList[0]?.topic || topicInput || "Karma Konular",
        count: activeQuestionsList.length,
        correct: correctCount,
        wrong: wrongCount,
        percentage: pct,
        date: stringifiedDate,
        difficulty: difficultySetting,
        type: questionStyle,
        questions: activeQuestionsList,
        userAnswers: userAnswers
      };

      const updatedHistory = [newRecord, ...pastQuizzes];
      setPastQuizzes(updatedHistory);
      localStorage.setItem("sokrates_custom_quizzes_history", JSON.stringify(updatedHistory));
      
      setGameState("results");
    }
  };

  // Back question logic
  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setShowExplanation(true);
    }
  };

  // Clear single history element
  const handleDeletePastRecord = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = pastQuizzes.filter(q => q.id !== id);
    setPastQuizzes(updated);
    localStorage.setItem("sokrates_custom_quizzes_history", JSON.stringify(updated));
    if (selectedPastQuiz?.id === id) {
      setSelectedPastQuiz(null);
      setGameState("welcome");
    }
  };

  // API Generate triggers
  const handleGenerateAIQuiz = async () => {
    if (!topicInput || topicInput.trim() === "") {
      setGenerationError("Lütfen soru oluşturmak istediğiniz konuyu yazın. Boş bırakılamaz.");
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);

    const savedSettings = db.getSettings();
    const customKey = savedSettings?.gemini_api_key || "";

    try {
      const resp = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson: selectedLesson,
          topic: topicInput,
          count: questionCount,
          difficulty: difficultySetting,
          type: questionStyle,
          customApiKey: customKey
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Sunucudan geçerli bir soru seti alınamadı.");
      }

      const parsedData = await resp.json();
      const questions: Question[] = parsedData?.questions || [];

      if (questions.length === 0) {
        throw new Error("Yapay zeka bu konuyla ilgili sorular kuramadı. Lütfen daha belirgin bir konu açıklaması girmeyi deneyin.");
      }

      // Re-map index ids to make sure they are sequential integers
      const validatedQuestions = questions.map((q, qidx) => ({
        ...q,
        id: qidx + 1,
        lesson: q.lesson || selectedLesson,
        topic: q.topic || topicInput,
        difficulty: q.difficulty || difficultySetting
      }));

      setActiveQuestionsList(validatedQuestions);
      setCurrentIdx(0);
      setUserAnswers({});
      setCorrectCount(0);
      setWrongCount(0);
      setShowExplanation(false);
      setGameState("playing");
    } catch (err: any) {
      console.error("AI Question Generation Error:", err);
      setGenerationError(err.message || "İnternet bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Export clipboard message
  const handleShareResult = (record: CustomQuizRecord | null) => {
    const actPct = record ? record.percentage : Math.round((correctCount / activeQuestionsList.length) * 100);
    const actC = record ? record.correct : correctCount;
    const actW = record ? record.wrong : wrongCount;
    const actTopic = record ? record.topic : activeQuestionsList[0]?.topic;

    const shareText = `Sokrates Sınav Asistanı Yapay Zeka Quizinde "${actTopic}" konusunu çözerek %${actPct} başarı sağladım! (${actC} Doğru, ${actW} Yanlış). Kendini ölçmek için hemen katıl! 📝✨`;
    navigator.clipboard.writeText(shareText);
    alert("Başarı puanı ve davet mesajınız panoya kopyalandı! Dostlarınla paylaşabilirsin! 📋🚀");
  };

  // View specific historic finished quiz 
  const handleReviewPastQuiz = (quiz: CustomQuizRecord) => {
    setSelectedPastQuiz(quiz);
    setGameState("history_review");
  };

  const isCurrentQuestionAnswered = userAnswers[currentIdx] !== undefined;

  // LECTURE CHIPS IN CONU SEC
  const LESSONS = ["Tarih", "Coğrafya", "Türkçe", "Vatandaşlık", "Matematik", "Fen Bilimleri", "Din Kültürü", "Genel Kültür", "Özel konu"];
  const COUNTS = [5, 10, 15, 20, 25];
  const DIFFICULTIES = ["Kolay", "Orta", "Zor", "Karışık"];
  const TYPES = ["KPSS tarzı", "TYT tarzı", "Okul sınavı tarzı", "Klasik bilgi ölçme", "Karışık"];

  // ====================================
  // RENDER LEVEL 1: LOADING SPINNER OR GENERATION IN PROGRESS
  // ====================================
  if (isGenerating) {
    return (
      <div className="p-6 flex flex-col items-center justify-center flex-1 h-full select-none animate-fade-in text-center max-w-md mx-auto">
        <div className="relative w-24 h-24 mb-6">
          {/* Pulsing ring background */}
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/15 animate-ping"></div>
          {/* Spinning progress outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin"></div>
          {/* Inner animated core logo element */}
          <div className="absolute inset-2 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
        </div>

        <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Yapay Zeka Soruları Hazırlıyor...
        </h3>
        
        <p className="text-xs text-gray-400 mt-2 max-w-[85%] leading-relaxed font-mono">
          Ders: <span className="text-indigo-400 font-bold">{selectedLesson}</span> • 
          Konu: <span className="text-amber-500 font-bold">"{topicInput}"</span> özelinde müfredat soruları, doğru/yanlış cevap veritabanı ve eğitici çözümler şekilleniyor.
        </p>
        
        <div className="mt-8 p-3 rounded-2xl bg-[#0d1023] border border-white/5 text-[10.5px] text-indigo-300 max-w-[85%] leading-relaxed">
          💡 <strong>Müfredat Kontrolü:</strong> Sokrates, yazdığınız konudan çıkmamak için (Tek Konu Modu) akıllı filtre uyguluyor. Bu işlem birkaç saniye sürebilir...
        </div>
      </div>
    );
  }

  // ====================================
  // RENDER LEVEL 2: ACTIVE GAME PLAY CONTROLLER SCREEN
  // ====================================
  if (gameState === "playing") {
    const activeQuestion = activeQuestionsList[currentIdx];
    const progressPct = Math.round(((currentIdx + 1) / activeQuestionsList.length) * 100);

    return (
      <div className="p-5 flex flex-col flex-1 h-full overflow-y-auto animate-fade-in max-w-lg mx-auto w-full">
        {/* Upper Header Statistics Rows */}
        <div className="flex items-center justify-between gap-3 mb-5 shrink-0">
          <div className="flex-1 flex items-center gap-2.5">
            {/* Horizontal progress indicators */}
            <div className="flex-1 bg-slate-900 border border-white/5 h-2.5 rounded-full overflow-hidden relative">
              <div 
                className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-black font-mono text-gray-400 shrink-0">
              {currentIdx + 1}/{activeQuestionsList.length}
            </span>
          </div>

          {/* Quick grade counter blocks */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Doğru sayısı (Yeşil Kutu) */}
            <div className="bg-emerald-500/15 border border-emerald-500/10 text-emerald-400 text-[10px] font-black font-mono px-2.5 py-1 rounded-xl flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{correctCount}</span>
            </div>
            {/* Yanlış sayısı (Kırmızı Kutu) */}
            <div className="bg-rose-500/15 border border-rose-500/10 text-rose-400 text-[10px] font-black font-mono px-2.5 py-1 rounded-xl flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>{wrongCount}</span>
            </div>
          </div>
        </div>

        {/* Soru Kartı Section */}
        <div className={`p-5 rounded-3xl border mb-5 shrink-0 select-none ${isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xs"}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-black uppercase">
              SORU {currentIdx + 1}
            </span>
            <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-lg">
              {activeQuestionsList[0]?.lesson} • {activeQuestion?.difficulty || difficultySetting}
            </span>
          </div>
          <h3 className={`text-base font-bold leading-relaxed tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            {activeQuestion?.question}
          </h3>
        </div>

        {/* Options Row card list */}
        <div className="flex flex-col gap-3 shrink-0">
          {activeQuestion?.options.map((optionText) => {
            const letter = optionText.trim().substring(0, 1); // "A", "B", "C", "D"
            const queryAnswer = userAnswers[currentIdx];
            const hasUserAnswered = queryAnswer !== undefined;
            const isThisOptionSelected = queryAnswer === letter;
            const isThisOptionCorrect = letter === activeQuestion.correctAnswer;

            let optionStyle = isDarkMode 
              ? "bg-[#0b0d1e]/90 border-white/5 text-gray-300 hover:bg-slate-900 hover:border-slate-800"
              : "bg-white border-slate-150 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm";

            let markVisual = null;

            if (hasUserAnswered) {
              if (isThisOptionCorrect) {
                // Correct gets green
                optionStyle = "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-500/5";
                markVisual = <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
              } else if (isThisOptionSelected) {
                // Incorrect chosen gets red
                optionStyle = "bg-rose-500/15 border-rose-500 text-rose-400 font-bold shadow-lg shadow-rose-500/5";
                markVisual = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
              } else {
                // Stale non-affected options faded out
                optionStyle = isDarkMode 
                  ? "bg-slate-950/40 border-white/5 text-gray-500 opacity-50"
                  : "bg-slate-50 border-slate-100 text-slate-400 opacity-60";
              }
            }

            return (
              <button
                key={optionText}
                type="button"
                disabled={hasUserAnswered}
                onClick={() => handleSelectOption(letter)}
                className={`w-full min-h-[52px] text-left px-4 py-3.5 rounded-2xl border text-[12px] tracking-tight transition-all flex items-center justify-between gap-3 ${optionStyle} ${!hasUserAnswered && "cursor-pointer active:scale-[0.99]"}`}
              >
                <span>{optionText}</span>
                {markVisual}
              </button>
            );
          })}
        </div>

        {/* Real-time explanation prompt popup below answers */}
        {showExplanation && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-[11px] leading-relaxed text-amber-500/90 animate-fade-in select-none">
            <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1 font-mono">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              Sokrates Çözüm Analizi:
            </span>
            <p>{activeQuestion?.explanation}</p>
          </div>
        )}

        {/* Lower layout action triggers */}
        <div className="flex flex-col gap-2.5 mt-auto pt-6 shrink-0">
          <button
            type="button"
            disabled={!isCurrentQuestionAnswered}
            onClick={handleNext}
            className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md ${!isCurrentQuestionAnswered ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-98"}`}
          >
            <span>{currentIdx < activeQuestionsList.length - 1 ? "Sonraki Soru" : "Testi Bitir ve Kaydet"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleBack}
            className={`w-full bg-transparent text-gray-400 border border-white/10 hover:border-white/20 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Önceki Soru</span>
          </button>
        </div>
      </div>
    );
  }

  // ====================================
  // RENDER LEVEL 3: RESULTS SUMMARY SCREEN
  // ====================================
  if (gameState === "results") {
    const rate = Math.round((correctCount / activeQuestionsList.length) * 100);

    return (
      <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto animate-fade-in max-w-lg mx-auto w-full">
        <div className="text-center mt-4">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Award className="w-8 h-8" />
          </div>
          <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Sınav Tamamlandı!
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-[80%] mx-auto font-mono">
            {activeQuestionsList[0]?.topic}
          </p>
        </div>

        {/* Percentage Card Board */}
        <div className={`p-6 rounded-3xl border text-center ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
          <div className="text-5xl font-black font-mono tracking-tighter text-amber-500 mb-2">
            %{rate}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">BAŞARI YÜZDESİ</span>

          {/* Quick numbers board */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-400">
              <span className="block text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">Doğru</span>
              <span className="text-lg font-extrabold font-mono">{correctCount} Soru</span>
            </div>
            <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400">
              <span className="block text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">Yanlış</span>
              <span className="text-lg font-extrabold font-mono">{wrongCount} Soru</span>
            </div>
          </div>
        </div>

        {/* Explanatory Review block with "Show Mistakes only" options */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-xs uppercase font-mono tracking-wider font-bold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Soru Çözüm Analizleri
            </h3>
            <button 
              onClick={() => setShowWrongOnlyInReview(!showWrongOnlyInReview)}
              className="text-[10px] font-bold text-indigo-400 font-mono hover:underline"
            >
              {showWrongOnlyInReview ? "Tümünü Göster" : "Sadece Yanlışları Listele"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {activeQuestionsList.map((q, idx) => {
              const uAns = userAnswers[idx];
              const isCorrect = uAns === q.correctAnswer;

              if (showWrongOnlyInReview && isCorrect) return null;

              return (
                <div 
                  key={q.question}
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    isCorrect 
                      ? isDarkMode ? "bg-emerald-950/10 border-emerald-500/10" : "bg-emerald-50/20 border-emerald-100"
                      : isDarkMode ? "bg-rose-950/10 border-rose-500/10" : "bg-rose-50/20 border-rose-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2 font-bold select-none">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCorrect ? "bg-emerald-400" : "bg-rose-500"}`} />
                    <span className={`${isDarkMode ? "text-white" : "text-slate-800"}`}>Soru {idx + 1}</span>
                    {!isCorrect && (
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-lg border border-rose-500/20 ml-auto font-normal font-mono">
                        Yanlış Yapıldı
                      </span>
                    )}
                  </div>

                  <p className={`font-semibold mb-2.5 ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
                    {q.question}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium mb-3">
                    <div className={`p-2 rounded-xl border ${isDarkMode ? "bg-emerald-950/20 border-emerald-500/10 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                      <span className="block text-[8px] uppercase text-gray-500">Doğru Cevat:</span>
                      <span>{q.options.find(o => o.startsWith(q.correctAnswer))}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${isCorrect ? "bg-emerald-950/20 border-emerald-500/10 text-emerald-400" : "bg-rose-950/20 border-rose-500/10 text-rose-400"}`}>
                      <span className="block text-[8px] uppercase text-gray-500">Sizin Cevabınız:</span>
                      <span>{uAns ? q.options.find(o => o.startsWith(uAns)) : "Boş bırakıldı"}</span>
                    </div>
                  </div>

                  {/* Teacher guidance box */}
                  <div className={`p-2.5 rounded-xl text-[10.5px] border ${isDarkMode ? "bg-slate-900/60 border-white/5 text-gray-400" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                    <span className="font-bold flex items-center gap-1 uppercase text-[9px] block tracking-wide text-amber-500 mb-1 font-mono">
                      <BookOpen className="w-3 h-3 text-amber-500" /> Detaylar:
                    </span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lower row buttons */}
        <div className="flex flex-col gap-2.5 mt-auto pt-6 shrink-0">
          <button
            onClick={() => {
              // Reset gameplay utilizing same question pool
              setCurrentIdx(0);
              setUserAnswers({});
              setCorrectCount(0);
              setWrongCount(0);
              setShowExplanation(false);
              setGameState("playing");
            }}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4 text-slate-950" />
            Tekrar Çöz (Testi Sıfırla)
          </button>

          <button
            onClick={() => handleShareResult(null)}
            className="w-full bg-slate-900 hover:bg-slate-850 text-gray-300 border border-white/5 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Puanımı Paylaş
          </button>

          <button
            onClick={() => {
              setGameState("welcome");
              loadReviewsFromLocalStorage();
            }}
            className="w-full bg-transparent text-gray-400 hover:text-white font-bold text-xs uppercase py-3 rounded-2xl transition-colors cursor-pointer text-center"
          >
            Ana Menüye Dön
          </button>
        </div>
      </div>
    );
  }

  // ====================================
  // RENDER LEVEL 4: PAST QUIZ HISTORY REVIEW DETAIL VIEW
  // ====================================
  if (gameState === "history_review" && selectedPastQuiz) {
    return (
      <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto animate-fade-in max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between border-b pb-4 border-white/5 shrink-0">
          <div>
            <span className="text-[9px] uppercase font-bold text-indigo-400 font-mono">GEÇMİŞ İNCELEME</span>
            <h3 className={`text-base font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {selectedPastQuiz.topic}
            </h3>
            <span className="text-[10px] text-gray-500 block font-mono mt-0.5">{selectedPastQuiz.date}</span>
          </div>

          <button 
            onClick={() => setGameState("welcome")}
            className="p-1 px-3 text-xs bg-slate-900 border border-white/5 rounded-xl text-gray-400 hover:text-white"
          >
            Geri
          </button>
        </div>

        {/* Stats card */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-center">
            <span className="block text-[8px] uppercase tracking-wider text-gray-500 font-bold font-mono">Ders/Stil</span>
            <span className="text-xs font-black block truncate mt-1 text-white">{selectedPastQuiz.lesson}</span>
          </div>
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center">
            <span className="block text-[8px] uppercase tracking-wider text-gray-500 font-bold font-mono">Doğru / Yanlış</span>
            <span className="text-xs font-black block mt-1 text-emerald-400 font-mono">
              {selectedPastQuiz.correct} d / {selectedPastQuiz.wrong} y
            </span>
          </div>
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-center">
            <span className="block text-[8px] uppercase tracking-wider text-gray-500 font-bold font-mono">Başarı Oranı</span>
            <span className="text-xs font-black block mt-1 text-amber-500 font-mono">%{selectedPastQuiz.percentage}</span>
          </div>
        </div>

        {/* Detailed Question lists */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400">Yanlış Yapılan Sorular</span>
            <button 
              onClick={() => setShowWrongOnlyInReview(!showWrongOnlyInReview)}
              className="text-[10px] font-bold text-indigo-400 font-mono hover:underline"
            >
              {showWrongOnlyInReview ? "Tümünü Listele" : "Sadece Yanlışları Listele"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {selectedPastQuiz.questions.map((q, idx) => {
              const uChoice = selectedPastQuiz.userAnswers[idx];
              const isCorrect = uChoice === q.correctAnswer;

              if (showWrongOnlyInReview && isCorrect) return null;

              return (
                <div 
                  key={q.question + idx}
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    isCorrect 
                      ? isDarkMode ? "bg-emerald-950/10 border-emerald-500/10" : "bg-emerald-50/20 border-emerald-100"
                      : isDarkMode ? "bg-rose-950/10 border-rose-500/10" : "bg-rose-50/20 border-rose-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2 font-bold select-none">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCorrect ? "bg-emerald-400" : "bg-rose-500"}`} />
                    <span>Soru {idx + 1}</span>
                    {!isCorrect && (
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-lg border border-rose-500/20 ml-auto font-normal font-mono">
                        Yanlış Yapıldı
                      </span>
                    )}
                  </div>

                  <p className={`font-semibold mb-2 ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
                    {q.question}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium mb-3">
                    <div className={`p-2 rounded-xl border ${isDarkMode ? "bg-emerald-950/10 border-emerald-500/10 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                      <span className="block text-[8px] uppercase text-gray-500">Doğru Cevat:</span>
                      <span>{q.options.find(o => o.startsWith(q.correctAnswer)) || q.correctAnswer}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${isCorrect ? "bg-emerald-950/10 border-emerald-500/10 text-emerald-400" : "bg-rose-950/10 border-rose-500/10 text-rose-400"}`}>
                      <span className="block text-[8px] uppercase text-gray-500">Sizin Seçiminiz:</span>
                      <span>{uChoice ? q.options.find(o => o.startsWith(uChoice)) : "Yanıtsız"}</span>
                    </div>
                  </div>

                  {/* Definition reason */}
                  <div className={`p-2.5 rounded-xl text-[10.5px] border ${isDarkMode ? "bg-slate-900/60 border-white/5 text-gray-400" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                    <span className="font-bold flex items-center gap-1 uppercase text-[9.5px] block tracking-wide text-amber-500 mb-1 font-mono">
                      <BookOpen className="w-3 h-3 text-amber-500" /> Detaylar:
                    </span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button 
            type="button" 
            onClick={() => handleShareResult(selectedPastQuiz)}
            className="flex-1 bg-slate-900 hover:bg-slate-850 text-gray-300 border border-white/5 p-3.5 rounded-2xl text-xs font-bold font-mono tracking-tight cursor-pointer flex items-center justify-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5" /> Paylaş
          </button>
          
          <button 
            type="button" 
            onClick={() => {
              // Retry / Retake this specific custom quiz
              setActiveQuestionsList(selectedPastQuiz.questions);
              setCurrentIdx(0);
              setUserAnswers({});
              setCorrectCount(0);
              setWrongCount(0);
              setShowExplanation(false);
              setGameState("playing");
            }}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Yeniden Çöz
          </button>
        </div>
      </div>
    );
  }

  // ====================================
  // RENDER LEVEL 5: DEFAULT ENTRANCE DASHBOARD (With Custom Gen panel & stats history lists)
  // ====================================
  return (
    <div className="p-4 flex flex-col gap-5 flex-1 overflow-y-auto animate-fade-in max-w-lg mx-auto w-full">
      {/* Visual Launcher Badge info */}
      <div className="text-center mt-3 shrink-0">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-[22px] flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Compass className="w-7 h-7" />
        </div>
        <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Sokrates Soru-Cevap / Quiz
        </h2>
        <p className="text-[10px] text-gray-400 mt-1 max-w-[85%] mx-auto leading-normal">
          KPSS, TYT veya okul sınavlarına özel, yapay zeka tarafından hazırlanan akıllı deneme sınavları
        </p>
      </div>

      {/* Segment controls tab toggle */}
      <div className="grid grid-cols-2 p-1 bg-slate-900/80 border border-white/5 rounded-2xl shrink-0">
        <button
          onClick={() => setActiveSubTab("create")}
          className={`py-2 text-xs font-black tracking-tight rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeSubTab === "create" ? "bg-amber-500 text-slate-950 shadow-md" : "text-gray-400 hover:text-white"}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Soru Oluştur / Seç
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`py-2 text-xs font-black tracking-tight rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${activeSubTab === "history" ? "bg-amber-500 text-slate-950 shadow-md" : "text-gray-400 hover:text-white"}`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Çözüm Geçmişi</span>
          {pastQuizzes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] px-1.5 h-4 min-w-4 flex items-center justify-center rounded-full font-black font-mono">
              {pastQuizzes.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab block 1: Create Custom Quiz Panel */}
      {activeSubTab === "create" && (
        <div className="flex flex-col gap-4 animate-fade-in">
          
          {/* Section A: Selection chips for lecture courses */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono tracking-wider font-bold text-gray-400 uppercase">DERS SEÇİMİ</label>
            <div className="flex flex-wrap gap-1.5">
              {LESSONS.map((les) => (
                <button
                  key={les}
                  type="button"
                  onClick={() => setSelectedLesson(les)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${selectedLesson === les ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold" : "bg-[#0b0c16] border-white/5 text-gray-400 hover:text-white"}`}
                >
                  {les}
                </button>
              ))}
            </div>
          </div>

          {/* Section B: Topic input field (Strict) */}
          <div className="flex flex-col gap-1.5 relative">
            <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-gray-400 font-bold uppercase">
              <span>KONU DETAYI</span>
              <span className="text-amber-500 text-[9px] font-bold">Tek Konu Modu Aktif 🛡️</span>
            </div>
            
            <input 
              type="text"
              value={topicInput}
              onChange={(e) => {
                setTopicInput(e.target.value);
                if (generationError) setGenerationError(null);
              }}
              placeholder="Örn: Osmanlı Devleti'nde Divan Teşkilatı, Türkiye'nin iklim tipleri, Üslü sayılar..."
              className="w-full bg-[#0b0c16] border border-white/5 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
            />
            <p className="text-[9px] text-gray-500 leading-normal block pl-1 font-mono">
              💡 Sokrates sadece girdiğiniz konudan soru türetir; konu dışına asla taşmaz.
            </p>
          </div>

          {/* Section C: Split config rows (Size count + Difficulty) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Number of questions choices */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono tracking-wider font-bold text-gray-400 uppercase">SORU SAYISI</label>
              <div className="grid grid-cols-5 bg-[#0b0c16] border border-white/10 rounded-xl overflow-hidden p-0.5">
                {COUNTS.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-1 rounded-lg text-[10.5px] font-bold font-mono transition-all cursor-pointer ${questionCount === cnt ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty rating selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono tracking-wider font-bold text-gray-400 uppercase">ZORLUK SEVİYESİ</label>
              <div className="grid grid-cols-4 bg-[#0b0c16] border border-white/10 rounded-xl overflow-hidden p-0.5 font-mono">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultySetting(diff)}
                    className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${difficultySetting === diff ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    {diff === "Karışık" ? "Krşk" : diff}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Section D: Question target styles */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono tracking-wider font-bold text-gray-400 uppercase font-bold">SORU TARZI / TİPİ</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((tIdx) => (
                <button
                  key={tIdx}
                  type="button"
                  onClick={() => setQuestionStyle(tIdx)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${questionStyle === tIdx ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-bold" : "bg-[#0b0c16] border-white/5 text-gray-400 hover:text-white"}`}
                >
                  {tIdx}
                </button>
              ))}
            </div>
          </div>

          {/* Error notification block if any */}
          {generationError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-1.5 select-none animate-fade-in font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Soru üretme Action button triggers */}
          <button
            onClick={handleGenerateAIQuiz}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider py-4 mt-2 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-lg shadow-indigo-600/25"
          >
            <Sparkles className="w-4 h-4 text-white" />
            Konudan Yapay Zeka Quizi Oluştur
          </button>

          {/* Secondary Quick play offline template trigger */}
          <div className="relative flex items-center my-1 select-none">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">VEYA ÇEVRİMDIŞI ÇÖZ</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={handleStartOfflineQuiz}
            className="w-full bg-[#0b0d1a] hover:bg-[#111327] border border-indigo-500/20 text-indigo-400 font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            Hazır Osmanlı Tarihi Quizi (10 Soru)
          </button>
        </div>
      )}

      {/* Tab block 2: History Review Record list */}
      {activeSubTab === "history" && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {pastQuizzes.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-widest">Kayıtlı Test Sınavları ({pastQuizzes.length})</span>
                <button
                  onClick={() => {
                    if (window.confirm("Tüm quiz çözüm geçmişinizi ve kaydedilmiş sonuçları silmek istediğinize emin misiniz?")) {
                      setPastQuizzes([]);
                      localStorage.removeItem("sokrates_custom_quizzes_history");
                    }
                  }}
                  className="text-[9px] text-rose-400 hover:text-rose-300 font-bold font-mono tracking-tight cursor-pointer"
                >
                  Tümünü Temizle
                </button>
              </div>

              {pastQuizzes.map((pq) => (
                <div
                  key={pq.id}
                  onClick={() => handleReviewPastQuiz(pq)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer relative hover:scale-[1.0125] ${isDarkMode ? "bg-slate-900/60 border-white/5 hover:bg-slate-900" : "bg-white border-slate-100 shadow-sm hover:bg-slate-50"}`}
                >
                  {/* Title and stats rows */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="max-w-[70%]">
                      <span className="text-[8.5px] font-black uppercase font-mono tracking-wide px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                        {pq.lesson}
                      </span>
                      <h4 className={`text-xs font-bold mt-1.5 leading-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        {pq.topic}
                      </h4>
                      <div className="flex gap-2.5 items-center mt-2 text-[9px] text-gray-500 font-mono font-medium">
                        <span>{pq.date}</span>
                        <span>•</span>
                        <span>{pq.count} Soru</span>
                      </div>
                    </div>

                    {/* Stats score ring percentage */}
                    <div className="text-right">
                      <span className="text-xl font-black font-mono tracking-tighter text-amber-500 block">
                        %{pq.percentage}
                      </span>
                      <span className="text-[8.5px] text-indigo-400 font-bold font-mono uppercase tracking-widest block mt-0.5">BAŞARI</span>
                      
                      <div className="flex items-center gap-1.5 mt-2 justify-end text-[9px] font-mono leading-none">
                        <span className="text-emerald-400">{pq.correct}d</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-rose-400">{pq.wrong}y</span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute trash button */}
                  <button
                    onClick={(e) => handleDeletePastRecord(e, pq.id)}
                    className="absolute bottom-2.5 right-2 text-gray-600 hover:text-rose-400 p-1 rounded-lg transition-all"
                    title="Bu Kaydı Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2">
              <Database className="w-8 h-8 text-gray-600 animate-pulse" />
              <span className="text-xs font-bold text-gray-400">Çözüm Kaydı Bulunmuyor</span>
              <p className="text-[10px] text-gray-500 max-w-[80%] mx-auto leading-relaxed">
                Henüz yapay zeka tarafından hazırlanan bir konuyu çözüp bitirmediniz. Soru oluşturun, çözün ve analizi burada biriktirin!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
