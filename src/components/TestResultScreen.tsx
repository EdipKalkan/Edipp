import React, { useState, useEffect } from "react";
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Share2, 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  HelpCircle, 
  Info,
  Calendar,
  Layers,
  Award as TrophyIcon
} from "lucide-react";

interface Question {
  id: number;
  lesson: string;
  topic: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
}

interface TestSessionData {
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

interface TestResultScreenProps {
  isDarkMode?: boolean;
  onRetake?: (session: TestSessionData) => void;
  onBackToMenu?: () => void;
  sessionData?: TestSessionData; // Optional prop, fallback to localStorage
}

export default function TestResultScreen({ 
  isDarkMode = true, 
  onRetake, 
  onBackToMenu,
  sessionData 
}: TestResultScreenProps) {
  const [session, setSession] = useState<TestSessionData | null>(null);

  useEffect(() => {
    if (sessionData) {
      setSession(sessionData);
    } else {
      // Pull data from the last completed test session stored in local storage
      const lastSessionJson = localStorage.getItem("sokrates_last_completed_test");
      if (lastSessionJson) {
        try {
          setSession(JSON.parse(lastSessionJson));
        } catch (err) {
          console.error("Failed to parse last completed test session:", err);
        }
      }
    }
  }, [sessionData]);

  // Handle Share result copied to clipboard
  const handleShareResult = () => {
    if (!session) return;
    const shareText = `Sokrates Sınav Asistanında "${session.topic}" konusuna ait quizi tamamlayarak %${session.percentage} başarı sağladım! (${session.correct} Doğru, ${session.wrong} Yanlış). Yapay zeka ile sen de kendini test et! 📝🚀`;
    navigator.clipboard.writeText(shareText);
    alert("Başarı puanınız ve davet mesajınız panoya kaydedildi! Arkadaşlarınızla paylaşabilirsiniz! 📋✨");
  };

  if (!session) {
    return (
      <div className="p-6 flex flex-col items-center justify-center flex-1 h-full select-none text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-[22px] flex items-center justify-center mb-4 animate-pulse">
          <Info className="w-8 h-8" />
        </div>
        <h3 className={`text-base font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Son Tamamlanmış Test Bulunamadı
        </h3>
        <p className="text-xs text-gray-400 mt-2 max-w-[85%] leading-relaxed">
          Sistemde çözülmüş ve tamamlanmış bir test oturumu kaydı henüz mevcut değil. Lütfen "Soru Oluştur" ekranından bir quiz başlatıp çözün!
        </p>
        {onBackToMenu && (
          <button
            onClick={onBackToMenu}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Soru Oluşturmaya Git
          </button>
        )}
      </div>
    );
  }

  const wrongAnswerIndexes = session.questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => {
      const uChoice = session.userAnswers[idx];
      return uChoice !== q.correctAnswer;
    });

  return (
    <div id="test-result-screen" className="p-5 flex flex-col gap-6 flex-1 overflow-y-auto animate-fade-in max-w-lg mx-auto w-full">
      {/* Visual Header */}
      <div className="text-center mt-3 shrink-0">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-[24px] flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Award className="w-9 h-9" />
        </div>
        <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Test Sonuç Raporu
        </h2>
        <p className="text-xs text-gray-400 mt-1 max-w-[85%] mx-auto font-mono">
          {session.topic}
        </p>
      </div>

      {/* Main Stats Card Board */}
      <div className={`p-6 rounded-3xl border text-center ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
        <div className="text-6xl font-black font-mono tracking-tighter text-amber-500 mb-2">
          %{session.percentage}
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#94a3b8] font-mono">BAŞARI YÜZDESİ</span>

        {/* Quick details dashboard grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-400">
            <span className="block text-[8.5px] uppercase tracking-wider text-gray-500 font-bold font-mono">Doğru Sayısı</span>
            <span className="text-xl font-bold font-mono block mt-1">{session.correct} Soru</span>
          </div>
          <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400">
            <span className="block text-[8.5px] uppercase tracking-wider text-gray-500 font-bold font-mono">Yanlış Sayısı</span>
            <span className="text-xl font-bold font-mono block mt-1">{session.wrong} Soru</span>
          </div>
        </div>

        {/* Informative list metadata */}
        <div className="grid grid-cols-3 gap-2 mt-4 border-t border-white/5 pt-4 text-[10px] font-mono text-gray-400">
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-gray-500 uppercase">Ders</span>
            <span className="font-semibold text-gray-300 mt-0.5">{session.lesson}</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/5">
            <span className="text-[8px] text-gray-500 uppercase">Zorluk</span>
            <span className="font-semibold text-gray-300 mt-0.5">{session.difficulty}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-gray-500 uppercase">Tarz</span>
            <span className="font-semibold text-gray-300 mt-0.5 truncate max-w-full px-1">{session.type}</span>
          </div>
        </div>
      </div>

      {/* Conditional: Wrong answers analysis / congratulations */}
      <div>
        <h3 className={`text-xs uppercase font-mono tracking-wider font-extrabold mb-3 flex items-center gap-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>HATA VE ANALİZ ANALİZİ ({session.wrong})</span>
        </h3>

        {wrongAnswerIndexes.length > 0 ? (
          <div className="flex flex-col gap-4">
            {wrongAnswerIndexes.map(({ q, idx }) => {
              const uChoice = session.userAnswers[idx];
              const parsedCorrectOption = q.options.find(o => o.trim().startsWith(q.correctAnswer)) || q.correctAnswer;
              const parsedUserOption = uChoice ? (q.options.find(o => o.trim().startsWith(uChoice)) || uChoice) : "Yanıtsız / Boş";

              return (
                <div 
                  key={q.question + idx}
                  className={`p-5 rounded-2xl border text-xs leading-relaxed ${isDarkMode ? "bg-rose-950/10 border-rose-500/15" : "bg-rose-50/30 border-rose-100"}`}
                >
                  <div className="flex items-center gap-1.5 mb-2 font-bold select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className={`${isDarkMode ? "text-white" : "text-slate-800"}`}>Soru {idx + 1}</span>
                    <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-lg border border-rose-500/20 ml-auto font-mono">
                      Yanlış / Boş
                    </span>
                  </div>

                  <p className={`font-semibold mb-3 ${isDarkMode ? "text-gray-200" : "text-slate-700"} text-[12.5px] leading-relaxed`}>
                    {q.question}
                  </p>

                  {/* Options breakdown boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10.5px] font-medium mb-4">
                    <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-[#0b0c16] border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                      <span className="block text-[8px] uppercase text-gray-500 font-bold mb-0.5">Doğru Cevat:</span>
                      <span className="font-semibold">{parsedCorrectOption}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-[#0b0c16] border-rose-500/20 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-600"}`}>
                      <span className="block text-[8px] uppercase text-gray-500 font-bold mb-0.5 font-sans">Sizin Seçiminiz:</span>
                      <span className="font-semibold">{parsedUserOption}</span>
                    </div>
                  </div>

                  {/* Socratic Teacher Explanation */}
                  <div className={`p-3.5 rounded-xl text-[11px] border ${isDarkMode ? "bg-slate-900/60 border-white/5 text-gray-400" : "bg-slate-50 border-slate-100 text-slate-500"}`}>
                    <span className="font-bold flex items-center gap-1 uppercase text-[9.5px] tracking-wide text-amber-500 mb-1.5 font-mono">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" /> 
                      <span>ÇÖZÜM ANALİZİ:</span>
                    </span>
                    <p className="leading-relaxed text-gray-300">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-emerald-500/15 rounded-3xl bg-emerald-500/5 text-emerald-400">
            <TrophyIcon className="w-10 h-10 mx-auto mb-3 text-amber-400 animate-bounce" />
            <h4 className="text-xs font-black uppercase tracking-wider">Mükemmel Skor! Tebrikler! 💯</h4>
            <p className="text-[10px] text-gray-400 mt-2 max-w-[85%] mx-auto leading-relaxed">
              Bu teste ait tüm soruları doğru cevaplayarak kusursuz bir başarı gösterdiniz! Sokrates zihninizi takdir ediyor!
            </p>
          </div>
        )}
      </div>

      {/* Actions / Triggers */}
      <div className="flex flex-col gap-3 mt-auto pt-6 shrink-0">
        {onRetake && (
          <button
            onClick={() => onRetake(session)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-slate-950" />
            Tekrar Çöz (Testi Sıfırla)
          </button>
        )}

        <button
          onClick={handleShareResult}
          className="w-full bg-slate-900 hover:bg-slate-850 text-gray-300 border border-white/5 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          Sonucu Arkadaşlarından Paylaş
        </button>

        {onBackToMenu && (
          <button
            onClick={onBackToMenu}
            className="w-full bg-transparent text-gray-400 hover:text-white font-bold text-xs uppercase py-3 rounded-2xl transition-colors cursor-pointer text-center"
          >
            Soru Oluşturucuya Dön
          </button>
        )}
      </div>
    </div>
  );
}
