import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Clock, 
  Trash2, 
  TrendingUp, 
  BookOpen, 
  Calendar,
  Award,
  ChevronRight,
  ListFilter
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from "recharts";
import { db } from "../services/databaseService";
import { DB_Subject, DB_StudySession } from "../types";

interface StatsScreenProps {
  isDarkMode: boolean;
}

export default function StatsScreen({ isDarkMode }: StatsScreenProps) {
  const [subjects, setSubjects] = useState<DB_Subject[]>([]);
  const [sessions, setSessions] = useState<DB_StudySession[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState<any[]>([]);
  const [weeklySubjectChartData, setWeeklySubjectChartData] = useState<any[]>([]);

  useEffect(() => {
    const subs = db.getSubjects();
    const sess = db.getStudySessions();
    setSubjects(subs);
    setSessions(sess);

    // 1. Prepare Recharts 7-Day data
    const daysOfWeek = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const now = new Date();
    const tempChartData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const dayName = daysOfWeek[d.getDay()];
      const dayLabel = `${d.getDate()} ${d.toLocaleString("tr-TR", { month: "short" })}`;

      // Filter sessions for this specific date
      const daySessions = sess.filter(s => s.started_at.startsWith(dateStr));
      const totalMinutes = Math.round(daySessions.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 60);

      tempChartData.push({
        date: dateStr,
        day: dayName,
        label: dayLabel,
        "Çalışma (dk)": totalMinutes
      });
    }
    setChartData(tempChartData);

    // 2. Prepare Subject Durations Breakdown
    const breakmap: Record<string, number> = {};
    sess.forEach(s => {
      breakmap[s.subject_id] = (breakmap[s.subject_id] || 0) + s.duration_seconds;
    });

    const tempBreakdown = subs.map(sub => {
      const totalSec = breakmap[sub.id] || 0;
      const totalMin = Math.round(totalSec / 60);
      return {
        id: sub.id,
        name: sub.name,
        color: sub.color,
        minutes: totalMin,
        percent: sess.length > 0 ? Math.round((totalSec / sess.reduce((a,c) => a + c.duration_seconds, 0)) * 100) : 0
      };
    }).filter(item => item.minutes > 0)
      .sort((a,b) => b.minutes - a.minutes);

    setSubjectBreakdown(tempBreakdown);

    // 3. Prepare Last 7 Days Subject Breakdown for Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const recentSessions = sess.filter(s => {
      const sDate = new Date(s.started_at);
      return sDate >= sevenDaysAgo;
    });

    const recentBreakmap: Record<string, number> = {};
    recentSessions.forEach(s => {
      recentBreakmap[s.subject_id] = (recentBreakmap[s.subject_id] || 0) + s.duration_seconds;
    });

    const tempRecentSubjectData = subs.map(sub => {
      const totalSec = recentBreakmap[sub.id] || 0;
      const totalMin = Math.round(totalSec / 60);
      return {
        name: sub.name,
        "Süre (dk)": totalMin,
        color: sub.color === "indigo" ? "#6366f1" :
               sub.color === "emerald" ? "#10b981" :
               sub.color === "amber" ? "#f59e0b" :
               sub.color === "rose" ? "#f43f5e" :
               sub.color === "cyan" ? "#06b6d4" :
               sub.color === "purple" ? "#a855f7" : "#cbd5e1"
      };
    }).filter(item => item["Süre (dk)"] > 0)
      .sort((a,b) => b["Süre (dk)"] - a["Süre (dk)"]);

    setWeeklySubjectChartData(tempRecentSubjectData);
  }, []);

  const handleDeleteSession = (id: string) => {
    if (confirm("Bu çalışma seansını silmek istediğinize emin misiniz? Süre istatistiklerinden düşülecektir.")) {
      db.deleteStudySession(id);
      // Reload states
      const sess = db.getStudySessions();
      setSessions(sess);
      
      // Reload chart
      const tempChartData = [...chartData];
      tempChartData.forEach(item => {
        const daySessions = sess.filter(s => s.started_at.startsWith(item.date));
        item["Çalışma (dk)"] = Math.round(daySessions.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 60);
      });
      setChartData(tempChartData);

      // Reload subject durations
      const breakmap: Record<string, number> = {};
      sess.forEach(s => {
        breakmap[s.subject_id] = (breakmap[s.subject_id] || 0) + s.duration_seconds;
      });
      const tempBreakdown = subjects.map(sub => {
        const totalSec = breakmap[sub.id] || 0;
        return {
          id: sub.id,
          name: sub.name,
          color: sub.color,
          minutes: Math.round(totalSec / 60)
        };
      }).filter(item => item.minutes > 0).sort((a,b) => b.minutes - a.minutes);
      setSubjectBreakdown(tempBreakdown);

      // Reload weekly subject chart data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(new Date().getDate() - 7);
      const recentSessions = sess.filter(s => {
        const sDate = new Date(s.started_at);
        return sDate >= sevenDaysAgo;
      });
      const recentBreakmap: Record<string, number> = {};
      recentSessions.forEach(s => {
        recentBreakmap[s.subject_id] = (recentBreakmap[s.subject_id] || 0) + s.duration_seconds;
      });
      const tempRecentSubjectData = subjects.map(sub => {
        const totalSec = recentBreakmap[sub.id] || 0;
        const totalMin = Math.round(totalSec / 60);
        return {
          name: sub.name,
          "Süre (dk)": totalMin,
          color: sub.color === "indigo" ? "#6366f1" :
                 sub.color === "emerald" ? "#10b981" :
                 sub.color === "amber" ? "#f59e0b" :
                 sub.color === "rose" ? "#f43f5e" :
                 sub.color === "cyan" ? "#06b6d4" :
                 sub.color === "purple" ? "#a855f7" : "#cbd5e1"
        };
      }).filter(item => item["Süre (dk)"] > 0).sort((a,b) => b["Süre (dk)"] - a["Süre (dk)"]);
      setWeeklySubjectChartData(tempRecentSubjectData);
    }
  };

  const totalMinStudied = Math.round(sessions.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 60);
  const averageDailyMin = chartData.length > 0 
    ? Math.round(chartData.reduce((acc, curr) => acc + curr["Çalışma (dk)"], 0) / chartData.length)
    : 0;

  return (
    <div className="p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
      <div>
        <h2 className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Çalışma Analitiği
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Haftalık süre dağılımları ve ders dengesi detayları
        </p>
      </div>

      {/* Main Stats Summary Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Kümülatif Zaman</span>
          <span className="text-xl font-extrabold font-mono text-indigo-400 mt-1 block">
            {totalMinStudied} <span className="text-xs text-slate-500 font-medium">dakika</span>
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Toplam ders mesaisi</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Günlük Ortalama</span>
          <span className="text-xl font-extrabold font-mono text-emerald-400 mt-1 block">
            {averageDailyMin} <span className="text-xs text-slate-500 font-medium">dakika</span>
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">Son yedi günlük seans ortalaması</p>
        </div>
      </div>

      {/* Recharts Past 7 Days AreaChart */}
      <div id="stats-chart" className={`p-4 rounded-3xl border h-64 ${isDarkMode ? "bg-[#0c0f22]/60 border-indigo-950" : "bg-white border-slate-100 shadow-sm"}`}>
        <span className="text-xs font-bold text-gray-400 mb-3 block px-1">Seans Odak Grafiği (Son 7 Gün)</span>
        <div className="w-full h-48 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
              <XAxis dataKey="label" stroke={isDarkMode ? "#64748b" : "#94a3b8"} />
              <YAxis stroke={isDarkMode ? "#64748b" : "#94a3b8"} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? "#0d1527" : "#ffffff", 
                  borderColor: isDarkMode ? "#1d2a45" : "#e2e8f0",
                  borderRadius: "8px",
                  color: isDarkMode ? "#f8fafc" : "#1e293b"
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="Çalışma (dk)" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorMin)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recharts Past 7 Days Subject BarChart */}
      <div id="subject-distribution-chart" className={`p-4 rounded-3xl border h-64 ${isDarkMode ? "bg-[#0c0f22]/60 border-indigo-950" : "bg-white border-slate-100 shadow-sm"}`}>
        <span className="text-xs font-bold text-gray-400 mb-3 block px-1">Ders Odak Dağılımı (Son 7 Gün)</span>
        {weeklySubjectChartData.length > 0 ? (
          <div className="w-full h-48 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={weeklySubjectChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="name" stroke={isDarkMode ? "#64748b" : "#94a3b8"} />
                <YAxis stroke={isDarkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? "#0d1527" : "#ffffff", 
                    borderColor: isDarkMode ? "#1d2a45" : "#e2e8f0",
                    borderRadius: "8px",
                    color: isDarkMode ? "#f8fafc" : "#1e293b"
                  }} 
                />
                <Bar dataKey="Süre (dk)" radius={[6, 6, 0, 0]}>
                  {weeklySubjectChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500 text-[11px]">
            <span>Ders odaklı süre grafiği için son 7 güne ait seans kaydı bulunmamaktadır.</span>
          </div>
        )}
      </div>

      {/* Subject Breakdown Progress Lines */}
      <div className={`p-5 rounded-3xl border ${isDarkMode ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-xs"}`}>
        <h3 className="text-xs uppercase font-mono tracking-wider text-gray-400 font-bold mb-4">
          Derslere Göre Zaman Dağılımı
        </h3>

        {subjectBreakdown.length > 0 ? (
          <div className="flex flex-col gap-4">
            {subjectBreakdown.map((item) => (
              <div key={item.id} className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className={`font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
                    {item.name}
                  </span>
                  <span className="font-mono text-gray-400 font-bold">
                    {item.minutes} dk ({item.percent}%)
                  </span>
                </div>
                {/* Custom Tailwind progress indicators */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${item.percent}%`, 
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-xs">
            Ders süre dökümünüzü çizmek için en az bir seans kaydetmelisiniz.
          </div>
        )}
      </div>

      {/* History Table Column */}
      <div className="flex flex-col gap-2.5">
        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-gray-400 px-1 mt-1">
          Tüm Kayıtlı Seanslar
        </h3>

        {sessions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sessions.map((item) => {
              const sub = subjects.find(s => s.id === item.subject_id);
              const top = db.getTopics().find(t => t.id === item.topic_id);
              const formattedDate = new Date(item.started_at).toLocaleString("tr-TR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div 
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: sub?.color || "#e2e8f0" }} />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                          {sub?.name || "Bilinmeyen Ders"}
                        </span>
                        {top && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-gray-400 font-mono">
                            {top.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 block truncate mt-0.5">
                        {formattedDate} • {item.note || "Not belirtilmemiş."}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-extrabold text-indigo-400 font-mono text-xs">
                      {Math.round(item.duration_seconds / 60)} dk
                    </span>
                    <button
                      onClick={() => handleDeleteSession(item.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDarkMode ? "border-red-950 hover:bg-red-500/10 text-red-400" : "border-red-100 hover:bg-red-50 text-red-500"
                      }`}
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-[10px] text-gray-500">Kayıtlı bir seans geçmişi bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
}
