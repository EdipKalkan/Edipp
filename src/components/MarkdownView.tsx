import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";


interface MarkdownViewProps {
  content: string;
}

export default function MarkdownView({ content }: MarkdownViewProps) {
  if (!content) return null;

  // Split and group elements: paragraphs, lists, headers, mathematical blocks or tables
  const rawLines = content.split("\n");
  const parsedElements: React.ReactNode[] = [];
  
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        parsedElements.push(
          <pre key={`code-${i}`} className="p-3 my-3 bg-black/60 border border-white/5 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto">
            <code>{codeBlockContent.join("\n")}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Mathematical formula block helper: if line is $$formula$$ or wraps in $$
    if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
      const formula = trimmed.slice(2, -2);
      parsedElements.push(renderMathCard(formula, i));
      continue;
    }

    // Start math formula block spanning multiple lines (rough regex/toggle or single line)
    if (trimmed.startsWith("$$") && !trimmed.endsWith("$$")) {
      let formulaLines = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().endsWith("$$")) {
        formulaLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) {
        // Collect last part of formula if any
        const lastLine = rawLines[i].trim();
        if (lastLine !== "$$") {
          formulaLines.push(lastLine.replace("$$", ""));
        }
      }
      parsedElements.push(renderMathCard(formulaLines.join(" "), i));
      continue;
    }

    // Markdown Table Parser
    if (trimmed.startsWith("|")) {
      const cells = line.split("|").map(c => c.trim()).filter((_, index, arr) => index > 0 && index < arr.length - 1);
      
      // Skip separator line |---|---|
      if (cells.every(cell => cell.startsWith("-") || cell === "")) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      
      // If next line is not part of the table, flush existing table
      const nextLine = rawLines[i + 1];
      if (!nextLine || !nextLine.trim().startsWith("|")) {
        parsedElements.push(renderTableCard(currentTable, i));
        currentTable = null;
      }
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      parsedElements.push(
        <h3 key={i} id={`h3-${i}`} className="text-sm font-bold text-indigo-400 mt-4 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
          {parseInline(trimmed.substring(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      parsedElements.push(
        <h2 key={i} id={`h2-${i}`} className="text-base font-bold text-indigo-300 mt-5 mb-2.5 flex items-center gap-2 border-b border-white/5 pb-1">
          <span className="w-2 h-4 bg-indigo-500 rounded-sm"></span>
          {parseInline(trimmed.substring(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      parsedElements.push(
        <h1 key={i} id={`h1-${i}`} className="text-lg font-extrabold text-white mt-6 mb-3 flex items-center gap-2">
          {parseInline(trimmed.substring(2))}
        </h1>
      );
      continue;
    }

    // Bullet list items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      parsedElements.push(
        <li key={i} id={`li-${i}`} className="ml-4 pl-1 text-[13px] leading-relaxed text-gray-300 list-disc my-1.5">
          {parseInline(trimmed.substring(2))}
        </li>
      );
      continue;
    }

    // Numbered list items
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      parsedElements.push(
        <li key={i} id={`ol-li-${i}`} className="ml-4 pl-1 text-[13px] leading-relaxed text-gray-300 list-decimal my-1.5">
          {parseInline(numberedMatch[2])}
        </li>
      );
      continue;
    }

    // Empty lines
    if (trimmed === "") {
      parsedElements.push(<div key={i} className="h-2"></div>);
      continue;
    }

    // Standalone math or general content
    parsedElements.push(
      <p key={i} id={`p-${i}`} className="text-[13px] leading-relaxed text-gray-300 my-1">
        {parseInline(line)}
      </p>
    );
  }

  return (
    <div className="markdown-content space-y-1 text-left select-text animate-fadeIn">
      {parsedElements}
    </div>
  );
}

// Format markdown tables into professional visual cards
function renderTableCard(table: { headers: string[]; rows: string[][] }, key: number) {
  return (
    <div key={`table-card-${key}`} className="my-4 overflow-hidden rounded-2xl border border-indigo-500/15 bg-indigo-950/20 shadow-lg shadow-indigo-950/40">
      <div className="px-3.5 py-1.5 bg-indigo-500/10 border-b border-indigo-500/10 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Sayısal Tablo & Veri Özeti
        </span>
        <span className="text-[8px] font-mono text-gray-500 uppercase">Sokrates Engine</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11.5px] text-gray-300">
          <thead>
            <tr className="bg-indigo-500/5 text-gray-200 font-bold border-b border-indigo-500/10">
              {table.headers.map((hdr, hIdx) => (
                <th key={hIdx} className="p-2.5 px-3 font-semibold text-indigo-300">
                  {parseInline(hdr)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {table.rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2 px-3 font-medium">
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Render dynamic mathematical formula cards for Integrals, Limits, Derivatives, etc.
function renderMathCard(formula: string, key: number) {
  // Let's identify the mathematical nature for a corresponding visual icon representation
  let symbolIcon = "∫"; 
  let badgeName = "Matematiksel Formül";
  let badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  let badgeGlow = "hover:border-emerald-500/30 shadow-emerald-500/5";

  const lowerFormula = formula.toLowerCase();
  if (lowerFormula.includes("limit") || lowerFormula.includes("lim_") || lowerFormula.includes("lim ")) {
    symbolIcon = "lim";
    badgeName = "Limit Teoremi";
    badgeColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
    badgeGlow = "hover:border-sky-500/30 shadow-sky-500/5";
  } else if (lowerFormula.includes("int ") || lowerFormula.includes("∫") || lowerFormula.includes("dx") || lowerFormula.includes("integral")) {
    symbolIcon = "∫";
    badgeName = "İntegral Hesabı";
    badgeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
    badgeGlow = "hover:border-indigo-500/30 shadow-indigo-500/5";
  } else if (lowerFormula.includes("dy/dx") || lowerFormula.includes("f'(") || lowerFormula.includes("türev") || lowerFormula.includes("derivative")) {
    symbolIcon = "d/dx";
    badgeName = "Diferansiyel / Türev";
    badgeColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
    badgeGlow = "hover:border-purple-500/30 shadow-purple-500/5";
  } else if (lowerFormula.includes("f(") || lowerFormula.includes("g(") || lowerFormula.includes("fonksiyon") || lowerFormula.includes("function")) {
    symbolIcon = "f(x)";
    badgeName = "Fonksiyon Denklemi";
    badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    badgeGlow = "hover:border-amber-500/30 shadow-amber-500/5";
  } else if (lowerFormula.includes("sum") || lowerFormula.includes("∑")) {
    symbolIcon = "∑";
    badgeName = "Toplam Sembolü";
    badgeColor = "text-pink-400 bg-pink-500/10 border-pink-500/20";
    badgeGlow = "hover:border-pink-500/30 shadow-pink-500/5";
  }

  // Pre-process & render through KaTeX
  let compiledHtml = "";
  try {
    compiledHtml = katex.renderToString(formula.trim(), {
      displayMode: true,
      throwOnError: false
    });
  } catch (err) {
    compiledHtml = formula;
  }

  return (
    <div key={`math-card-${key}`} className={`my-4 p-4 rounded-2xl border transition-all shadow-md ${badgeGlow} bg-[#0b0e1e]/80 border-white/5`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
          {badgeName}
        </span>
        <span className="text-[9px] font-mono text-gray-500">Matematiksel Sembolizm</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Large Math Symbol representation */}
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-mono font-medium text-lg text-indigo-400 select-none shadow-inner shrink-0">
          {symbolIcon}
        </div>
        
        {/* Dynamic Display */}
        <div className="flex-1 min-w-0 py-1 overflow-x-auto select-all scrollbar-thin">
          <div 
            className="text-sm tracking-wide text-white leading-relaxed"
            dangerouslySetInnerHTML={{ __html: compiledHtml }}
          />
        </div>
      </div>
    </div>
  );
}

// Function to handle inline markdown parsing like bold **text**, `code`, and inline math $x^2$
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // We loop to match bold "**", highlighters "`", and inline math "$"
  const regex = /(\*\*.*?\*\*|`.*?`|\$.*?\$)/g;
  const matches = text.split(regex);

  if (matches.length === 1) {
    return [text];
  }

  return matches.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-white bg-indigo-500/10 px-1 py-0.5 rounded text-[13px]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="font-mono text-xs bg-black/40 text-purple-300 px-1 py-0.5 rounded border border-white/5">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      const cleanSub = part.slice(1, -1);
      let inlineHtml = "";
      try {
        inlineHtml = katex.renderToString(cleanSub.trim(), {
          displayMode: false,
          throwOnError: false
        });
      } catch (err) {
        inlineHtml = cleanSub;
      }
      return (
        <span 
          key={index} 
          className="inline-block font-mono font-semibold text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded text-[12.5px] align-middle"
          dangerouslySetInnerHTML={{ __html: inlineHtml }}
        />
      );
    }
    return part;
  });
}

