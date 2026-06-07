import React, { useState } from "react";
import { Sparkles, BarChart3, HelpCircle, Variable, Calculator, FunctionSquare, Layers } from "lucide-react";

interface SymbolItem {
  id: string;
  name: string;
  symbol: string;
  badge: string;
  badgeColor: string;
  description: string;
  visualImageKey: string; // Describes the custom visual box concept
  sampleEquation: string;
  evaluationTable: {
    headers: string[];
    rows: string[][];
  };
  explanationSteps: string[];
}

export default function SymbolLibrary({ isDarkMode }: { isDarkMode: boolean }) {
  const [activeCategory, setActiveCategory] = useState<string>("integral");

  const symbolsData: Record<string, SymbolItem> = {
    integral: {
      id: "integral",
      name: "İntegral Hesabı",
      symbol: "∫",
      badge: "Alan & Akümülasyon",
      badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      description: "İntegral, bir eğrinin altında kalan alanı, birikimli toplamı ve değişimi temsil eder. Geometrik olarak sürekli bir toplam işlemidir.",
      visualImageKey: "riemann_sum_graph",
      sampleEquation: "f(x) = \\int_a^b x^2 \\, dx",
      evaluationTable: {
        headers: ["Aralık [a, b]", "Denklem f(x)", "Riemann Alt Toplamı", "Gerçek İntegral Alanı"],
        rows: [
          ["[0, 1]", "x²", "0.218", "0.333 (1/3)"],
          ["[0, 2]", "x²", "2.125", "2.667 (8/3)"],
          ["[1, 3]", "2x", "7.500", "8.000"],
          ["[0, π]", "sin(x)", "1.980", "2.000"]
        ]
      },
      explanationSteps: [
        "1. Sonsuz küçük genişlikteki dikdörtgenlerin alanları toplamıdır.",
        "2. Türevin tam tersi işlem (ters türev) olarak da tanımlanır.",
        "3. Fizikte yer değiştirmeyi bulmak için hızın integrali alınır."
      ]
    },
    limit: {
      id: "limit",
      name: "Limit Yakınsama",
      symbol: "lim",
      badge: "Sonsuz Yakınlık",
      badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      description: "Limit, bir değişkenin belirli bir değere yaklaşırken, fonksiyonun ulaştığı veya yaklaştığı sınır değerdir.",
      visualImageKey: "limit_approach_graph",
      sampleEquation: "\\lim_{x \\to 3} \\frac{x^2 - 9}{x - 3} = 6",
      evaluationTable: {
        headers: ["Yaklaşım Adımı (x → 3)", "Sol Değerler (x < 3)", "Sağ Değerler (x > 3)", "Fonksiyon f(x) Değeri"],
        rows: [
          ["Adım 1", "2.9", "3.1", "5.900 → 6.100"],
          ["Adım 2", "2.99", "3.01", "5.990 → 6.010"],
          ["Adım 3", "2.999", "3.001", "5.999 → 6.001"],
          ["Sınır Değer", "3.000 (Tanımsız)", "3.000 (Tanımsız)", "6.000 (Limit Değeri)"]
        ]
      },
      explanationSteps: [
        "1. Fonksiyonun o noktada tanımlı olması şart değildir.",
        "2. Sağ taraftan ve sol taraftan yaklaşıldığında aynı değere ulaşılmalıdır.",
        "3. Süreklilik için limit değeri, o noktadaki fonksiyon değerine eşit olmalıdır."
      ]
    },
    turev: {
      id: "turev",
      name: "Türev / Değişim Oranı",
      symbol: "d/dx",
      badge: "Anlık Eğim & Hız",
      badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      description: "Türev, bir fonksiyonun herhangi bir andaki anlık değişim oranını, yani eğrinin o noktadaki teğetinin eğimini verir.",
      visualImageKey: "tangent_slope_line",
      sampleEquation: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
      evaluationTable: {
        headers: ["Fonksiyon f(x)", "Anlık Nokta (x)", "Teğet Doğrusu Eğimi (f'(x))", "Fiziksel Anlam"],
        rows: [
          ["x² (Pozisyon)", "x = 3", "m = 6", "Anlık Hız (6 m/s)"],
          ["3x² + 2", "x = 1", "m = 6", "İvme veya Artış Oranı"],
          ["sin(x)", "x = 0", "m = 1", "Anlık Değişim Katsayısı"],
          ["ln(x)", "x = 2", "m = 0.5", "Yarı Yarıya Dağılım Hızı"]
        ]
      },
      explanationSteps: [
        "1. İki nokta arasındaki ortalama hızın, zaman aralığı sıfıra giderken aldığı limit değerdir.",
        "2. f'(x) > 0 ise fonksiyon o aralıkta artandır.",
        "3. Maksimum ve minimum noktalarını belirlemek için türev sıfıra eşitlenir (f'(x) = 0)."
      ]
    },
    fonksiyon: {
      id: "fonksiyon",
      name: "Matematiksel Fonksiyon",
      symbol: "f(x)",
      badge: "Girdi & Çıktı Eşleşmesi",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      description: "Fonksiyon, bir kümenin her bir elemanını diğer kümenin yalnızca bir elemanıyla eşleştiren özel bir bağıntıdır.",
      visualImageKey: "function_map_machine",
      sampleEquation: "f(x) = 3x^2 - 4x + 1",
      evaluationTable: {
        headers: ["Girdi Değeri (x)", "İşlem Matrisi", "Çıktı Değeri f(x)", "Grafik Koordinatı (x, y)"],
        rows: [
          ["x = -1", "3(-1)² - 4(-1) + 1", "8", "(-1, 8)"],
          ["x = 0", "3(0)² - 4(0) + 1", "1", "(0, 1)"],
          ["x = 1", "3(1)² - 4(1) + 1", "0", "(1, 0)"],
          ["x = 2", "3(2)² - 4(2) + 1", "5", "(2, 5)"]
        ]
      },
      explanationSteps: [
        "1. Her girdi (x) yalnızca bir adet çıktıya (y) sahip olabilir.",
        "2. Tanım kümesinde açıkta eleman kalamaz fakat değer kümesinde kalabilir.",
        "3. Dikey doğru testi ile bir grafiğin fonksiyon olup olmadığı anlaşılır."
      ]
    },
    denklem: {
      id: "denklem",
      name: "Cebirsel Denklemler (3x)",
      symbol: "3x",
      badge: "Değişken & Orantı",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      description: "Değişkenler ve katsayılar içeren cebirsel ifadelerdir. Örneğin '3x' ifadesi, x değişkeninin tam üç katını veya üç adet x nesnesini sembolize eder.",
      visualImageKey: "variable_algebra_scale",
      sampleEquation: "3x = 15 \\implies x = 5",
      evaluationTable: {
        headers: ["Değişken Değeri (x)", "Simge / Resim Temsili", "Sayısal Değer (3x)", "Gelişen Oran Tablosu"],
        rows: [
          ["x = 1", "●", "3", "3'lük Tekil Grup"],
          ["x = 2", "●●", "6", "6'lık Matris Kümesi"],
          ["x = 3", "●●●", "9", "9'lu Kübik Kutu"],
          ["x = 5", "●●●●●", "15", "15'lik Denge Terazisi"]
        ]
      },
      explanationSteps: [
        "1. Değişken (x) bilinmeyen bir niceliği temsil eden bir kutu gibidir.",
        "2. Katsayı (3), o kutudan kaç adet yan yana koyacağımızı belirtir.",
        "3. Denklem çözümü, terazinin iki kefesini de dengede tutma prensibidir."
      ]
    }
  };

  const selected = symbolsData[activeCategory] || symbolsData.integral;

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      {/* Short introduction header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h2 className={`text-md font-extrabold tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            Sokrates İnteraktif Sembol Kütüphanesi
          </h2>
        </div>
        <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Rakamların ötesinde, matematiksel işaretlerin ve denklemlerin ardındaki görsel mantığı ve sayısal veri tablolarını keşfedin.
        </p>
      </div>

      {/* Horizontal pill navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0 border-b border-white/5">
        {Object.values(symbolsData).map((sym) => (
          <button
            key={sym.id}
            onClick={() => setActiveCategory(sym.id)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeCategory === sym.id
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                : isDarkMode
                  ? "bg-[#0d1020] text-gray-400 border-white/5 hover:text-white"
                  : "bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200"
            }`}
          >
            <span className="font-mono text-xs mr-1 opacity-80">{sym.symbol}</span>
            {sym.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Main interactive visual card display container */}
      <div className={`p-4.5 rounded-[24px] border ${
        isDarkMode ? "bg-[#0b0e1e]/90 border-white/5 shadow-xl" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex items-center justify-between mb-3.5">
          <span className={`text-[9px] font-extrabold uppercase tracking-[0.12em] px-2.5 py-1 rounded-md border ${selected.badgeColor}`}>
            {selected.badge}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Sayısal & Sembolik Temsil</span>
        </div>

        {/* Master Symbol Block Illustration */}
        <div className="flex flex-col md:flex-row items-center gap-4.5 mb-5 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden">
          {/* Visual Matrix Box Background decoration */}
          <div className="absolute right-0 top-0 -mt-4 -mr-4 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          {/* Premium Abstract Math Representation Canvas */}
          <div className="w-16 h-16 rounded-[18px] bg-indigo-600 hover:rotate-12 transition-transform flex flex-col items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-600/20 relative shrink-0">
            <span className="font-mono select-none">{selected.symbol}</span>
            <div className="absolute bottom-1 text-[8px] font-mono tracking-widest leading-none text-indigo-200">MODEL</div>
          </div>

          <div className="flex-1 min-w-0 text-left">
            <h3 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              {selected.name} Simge Mantığı
            </h3>
            <p className={`text-[12px] leading-relaxed mt-1 ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
              {selected.description}
            </p>
          </div>
        </div>

        {/* Visual equation block */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase">Örnek Cebirsel Gösterim</div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <code className="text-xs font-mono text-indigo-300 font-extrabold select-all">
              {selected.sampleEquation}
            </code>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/15">
              Aktif Formül
            </span>
          </div>
        </div>

        {/* Evaluation Table card - satisfies "Uygulamada sayısal bir veri açıklanırken, tablosal şekilde açıklansın" */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-gray-500 mb-1.5 uppercase">Sayısal Veri & Değerler Tablosu</div>
          
          <div className="overflow-hidden border border-white/5 rounded-xl bg-[#070a14] shadow-inner">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-indigo-500/10 text-indigo-300 border-b border-indigo-500/10">
                  {selected.evaluationTable.headers.map((hdr, idx) => (
                    <th key={idx} className="p-2 py-2.5 px-3 font-bold">{hdr}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {selected.evaluationTable.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-white/5 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={`p-2 px-3 font-medium ${cellIdx === 0 ? "text-indigo-400 font-semibold" : ""}`}>
                        {cell.includes("●") ? (
                          <div className="flex items-center gap-0.5">
                            <span className="text-rose-400 select-all font-bold">{cell}</span>
                            <span className="text-[9px] text-gray-500">[{cell.length / 2}]</span>
                          </div>
                        ) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pedagogical logic steps */}
        <div className="bg-indigo-500/5 rounded-xl border border-indigo-500/10 p-3 text-left">
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Öğretmen İpucu & Süreç Mantığı</span>
          </h4>
          <div className="space-y-1">
            {selected.explanationSteps.map((step, idx) => (
              <p key={idx} className={`text-[11.5px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}>
                {step}
              </p>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
