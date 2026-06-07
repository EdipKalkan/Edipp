import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  MessageSquare, 
  BrainCircuit, 
  PenTool, 
  CheckCircle, 
  ChevronRight, 
  Settings, 
  RotateCcw, 
  Copy, 
  Check, 
  Sun, 
  Moon, 
  HelpCircle, 
  Lightbulb, 
  Play, 
  Trash2, 
  Terminal, 
  Loader2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Workflow, 
  User, 
  Lock, 
  Unlock,
  Variable
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MobileFrame from "./components/MobileFrame";
import SettingsTab from "./components/SettingsTab";
import MarkdownView from "./components/MarkdownView";
import SymbolLibrary from "./components/SymbolLibrary";

import HomeScreen from "./components/HomeScreen";
import FocusTimerScreen from "./components/FocusTimerScreen";
import StatsScreen from "./components/StatsScreen";
import GeminiCoachScreen from "./components/GeminiCoachScreen";
import MistakeAnalysisScreen from "./components/MistakeAnalysisScreen";
import QuizScreen from "./components/QuizScreen";
import SettingsScreen from "./components/SettingsScreen";
import { db } from "./services/databaseService";
import { PdfService } from "./services/pdfService";
import { gemini } from "./services/geminiService";
import { summaryService } from "./services/summaryService";
import { questionService } from "./services/questionService";
import { testService } from "./services/testService";
import { extractTextFromPDF } from "./utils/pdfExtractor";
import { 
  Theme, 
  ExplanationMode, 
  TabName, 
  AppSettings, 
  PDFDoc, 
  ChatMessage, 
  SavedAnalysis, 
  TestQuestion, 
  SavedTest,
  Flashcard
} from "./types";

export default function App() {
  // Theme & Preferences
  const [theme, setTheme] = useState<Theme>(() => {
    const dbSettings = db.getSettings();
    return dbSettings.theme || "dark";
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const dbSettings = db.getSettings();
    return {
      apiKey: dbSettings.gemini_api_key || "",
      theme: dbSettings.theme || "dark",
      language: dbSettings.answer_language || "tr",
      explanationMode: dbSettings.explanation_level === "Ekonomik" ? "simple" : dbSettings.explanation_level === "Dengeli" ? "student" : "professional",
      selected_model: dbSettings.selected_model || "gemini-2.5-flash-lite",
      explanation_level: dbSettings.explanation_level || "Ekonomik",
      api_reduction_mode: dbSettings.economy_mode_enabled !== false
    };
  });

  // PDF Document State
  const [currentPDF, setCurrentPDF] = useState<PDFDoc | null>(() => {
    const saved = localStorage.getItem("sokrates_current_pdf");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  // Active Screen / Tab
  const [activeTab, setActiveTab] = useState<TabName>("home");
  const [analysisSubTab, setAnalysisSubTab] = useState<"pdf" | "library">("pdf");

  // PDF Extract Loading progress State
  const [extractProgress, setExtractProgress] = useState<{
    currentPage: number;
    totalPages: number;
    status: "idle" | "loading-lib" | "parsing" | "completed" | "error";
    message: string;
  }>({
    currentPage: 0,
    totalPages: 0,
    status: "idle",
    message: ""
  });

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini API Action States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processType, setProcessType] = useState<string>(""); // "summary", "student", "exam", "chat", "test", "solve"
  const [apiError, setApiError] = useState<string | null>(null);

  // Persistent Results (Stored in localStorage linked by PDF fileName as key)
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(() => {
    const activeDoc = localStorage.getItem("sokrates_current_pdf");
    if (activeDoc) {
      try {
        const parsed: PDFDoc = JSON.parse(activeDoc);
        const savedData = localStorage.getItem(`sokrates_analysis_${parsed.fileName}`);
        if (savedData) {
          return JSON.parse(savedData);
        }
      } catch (e) {}
    }
    return null;
  });

  // UI state variables
  const [copiedText, setCopiedText] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [customSolveInput, setCustomSolveInput] = useState("");
  const [showSolverMenu, setShowSolverMenu] = useState(false);

  // Custom Test Parameters State
  const [testCount, setTestCount] = useState<number>(5);
  const [testDifficulty, setTestDifficulty] = useState<"kolay" | "orta" | "zor">("orta");
  const [activeTest, setActiveTest] = useState<SavedTest | null>(null);

  // Analysis Tabs Segment Section
  const [analysisSection, setAnalysisSection] = useState<"summaries" | "flashcards" | "preview">("summaries");

  // Document Pages State for Preview Section
  const [activePages, setActivePages] = useState<any[]>([]);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [pageSearchQuery, setPageSearchQuery] = useState<string>("");

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState<number>(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState<boolean>(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState<boolean>(false);

  // Timer state for interactive tests
  const [testTimeElapsed, setTestTimeElapsed] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Dedicated Study Progress Statistics States
  const [studyStats, setStudyStats] = useState<any>(() => db.getStudyStats("global"));
  const [docStudyStats, setDocStudyStats] = useState<any>(null);

  const refreshStudyStats = () => {
    setStudyStats(db.getStudyStats("global"));
    if (currentPDF) {
      const matchDoc = db.getDocuments().find(d => d.file_name === currentPDF.fileName);
      if (matchDoc) {
        setDocStudyStats(db.getStudyStats(matchDoc.id));
      } else {
        setDocStudyStats(null);
      }
    } else {
      setDocStudyStats(null);
    }
  };

  // Network Offline Status Detector
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Shortcut Select States from HomeScreen to FocusTimer
  const [shortcutSubjectId, setShortcutSubjectId] = useState<string | undefined>(undefined);
  const [shortcutTopicId, setShortcutTopicId] = useState<string | undefined>(undefined);

  const handleStartTimerFromShortcut = (subjectId: string, topicId?: string) => {
    setShortcutSubjectId(subjectId);
    setShortcutTopicId(topicId);
    setActiveTab("timer");
  };

  const handleTimerSuccess = () => {
    setShortcutSubjectId(undefined);
    setShortcutTopicId(undefined);
    setActiveTab("home");
  };

  const handleSettingsChangeInApp = () => {
    const dbSettings = db.getSettings();
    setSettings({
      apiKey: dbSettings.gemini_api_key || "",
      theme: dbSettings.theme || "dark",
      language: dbSettings.answer_language || "tr",
      explanationMode: dbSettings.explanation_level === "Ekonomik" ? "simple" : dbSettings.explanation_level === "Dengeli" ? "student" : "professional",
      selected_model: dbSettings.selected_model || "gemini-3.1-flash-lite",
      explanation_level: dbSettings.explanation_level || "Ekonomik",
      api_reduction_mode: dbSettings.economy_mode_enabled !== false
    });
    setTheme(dbSettings.theme || "dark");
  };

  const handleToggleThemeInApp = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const dbSettings = db.getSettings();
    db.saveSettings({
      ...dbSettings,
      theme: nextTheme
    });
    setTheme(nextTheme);
    setSettings(prev => ({ ...prev, theme: nextTheme }));
  };

  // Load PDF pages whenever currentPDF changes
  useEffect(() => {
    if (!currentPDF) {
      setActivePages([]);
      return;
    }
    const allDocs = db.getDocuments();
    const matchingDoc = allDocs.find(d => d.file_name === currentPDF.fileName);
    if (matchingDoc) {
      const pages = db.getPagesForDocument(matchingDoc.id);
      setActivePages(pages);
    } else {
      // Fallback
      if (currentPDF.extractedText) {
        const fallbackPages = currentPDF.extractedText.split(/\[Sayfa \d+\]/ig)
          .map((text, i) => ({
            id: `${currentPDF.fileName}_fallback_${i + 1}`,
            document_id: "fallback",
            page_number: i + 1,
            clean_text: text.trim(),
            raw_text: text.trim()
          })).filter(p => p.clean_text);
        setActivePages(fallbackPages);
      }
    }
    setSelectedPageNum(1);
    setIsFlashcardFlipped(false);
    setActiveFlashcardIndex(0);
  }, [currentPDF]);

  // Load study stats on mount or whenever currentPDF changes
  useEffect(() => {
    refreshStudyStats();
  }, [currentPDF]);

  // Load and synchronize flashcard records from saved analysis
  useEffect(() => {
    if (savedAnalysis && savedAnalysis.flashcards) {
      setFlashcards(savedAnalysis.flashcards);
      setIsFlashcardFlipped(false);
      setActiveFlashcardIndex(0);
    } else {
      setFlashcards([]);
    }
  }, [savedAnalysis]);

  // Test-taking interval timer trigger
  useEffect(() => {
    if (activeTest && activeTest.score === undefined) {
      setTestTimeElapsed(0);
      timerRef.current = setInterval(() => {
        setTestTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeTest]);

  // Save changes helper
  const updateSavedAnalysis = (updated: Partial<SavedAnalysis>) => {
    if (!currentPDF) return;
    const initial: SavedAnalysis = savedAnalysis || {
      fileName: currentPDF.fileName,
      chatHistory: [],
      tests: []
    };
    const newAnalysis = { ...initial, ...updated };
    setSavedAnalysis(newAnalysis);
    localStorage.setItem(`sokrates_analysis_${currentPDF.fileName}`, JSON.stringify(newAnalysis));
  };

  // Sync state settings back to localStorage
  useEffect(() => {
    localStorage.setItem("sokrates_settings", JSON.stringify(settings));
    localStorage.setItem("sokrates_theme", theme);
  }, [settings, theme]);

  // Adjust theme on document element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.backgroundColor = "#030408";
    } else {
      root.classList.remove("dark");
      root.style.backgroundColor = "#f8fafc";
    }
  }, [theme]);

  // Handler to trigger custom theme changes
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setSettings(prev => ({ ...prev, theme: nextTheme }));
  };

  // PDF Drag & Drop logic handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        await processFile(file);
      } else {
        alert("Lütfen yalnızca PDF formatında bir dosya yükleyin.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // Main file processor to parse text with PDF.js and setup initial view
  const processFile = async (file: File) => {
    try {
      setApiError(null);
      
      // Perform complete modular IndexedDB processing: parses, validates readability/OCR,
      // partitions pages, designs local keyword heuristics, constructs chunks, and caches results!
      const outcome = await PdfService.processPDF(file, (p) => {
        setExtractProgress(p);
      });

      const pdfData: PDFDoc = {
        fileName: outcome.doc.file_name,
        fileSize: outcome.doc.file_size,
        extractedText: outcome.pages.map(p => p.clean_text).join("\n"),
        pageCount: outcome.doc.page_count,
        uploadDate: new Date(outcome.doc.created_at).toLocaleDateString("tr-TR")
      };

      setCurrentPDF(pdfData);
      localStorage.setItem("sokrates_current_pdf", JSON.stringify(pdfData));

      // Synchronize database history for PDF summary cache
      const cachedProf = db.getSummary(outcome.doc.id, "professional");
      const cachedStudent = db.getSummary(outcome.doc.id, "student");
      const cachedExam = db.getSummary(outcome.doc.id, "exam");
      const chatLogs = db.getQuestionsForDocument(outcome.doc.id);
      const testLogs = db.getTestsForDocument(outcome.doc.id);

      const mappedChats = chatLogs.map(q => [
        { id: q.id + "_q", role: "user" as const, content: q.question_text, timestamp: new Date(q.created_at).toLocaleTimeString() },
        { id: q.id + "_a", role: "assistant" as const, content: q.answer_text, timestamp: new Date(q.created_at).toLocaleTimeString() }
      ]).flat();

      const mappedTests = testLogs.map(t => {
        try {
          const parsed = JSON.parse(t.test_json);
          return {
            id: t.id,
            difficulty: t.difficulty,
            questionCount: t.question_count,
            questions: parsed.questions || [],
            userAnswers: t.user_answers ? JSON.parse(t.user_answers) : {},
            score: t.score,
            date: new Date(t.created_at).toLocaleDateString("tr-TR")
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean) as any[];

      const syncAnalysis: SavedAnalysis = {
        fileName: file.name,
        summary: cachedProf?.summary_text,
        studentExplainer: cachedStudent?.summary_text,
        examNotes: cachedExam?.summary_text,
        chatHistory: mappedChats,
        tests: mappedTests
      };

      setSavedAnalysis(syncAnalysis);
      localStorage.setItem(`sokrates_analysis_${file.name}`, JSON.stringify(syncAnalysis));

      setExtractProgress(prev => ({ ...prev, status: "idle" }));
      setActiveTab("analysis"); // Move instantly to analysis panel
    } catch (err: any) {
      console.error(err);
      setExtractProgress(prev => ({
        ...prev,
        status: "error",
        message: err.message || "PDF işlenirken beklenmedik bir hata oluştu."
      }));
    }
  };

  // Restores a previously parsed document instantly from database summary cache
  const reloadHistoricDocument = (doc: any) => {
    const pdfData: PDFDoc = {
      fileName: doc.file_name,
      fileSize: doc.file_size,
      extractedText: "",
      pageCount: doc.page_count,
      uploadDate: new Date(doc.created_at).toLocaleDateString("tr-TR")
    };

    const pages = db.getPagesForDocument(doc.id);
    pdfData.extractedText = pages.map(p => p.clean_text).join("\n");

    setCurrentPDF(pdfData);
    localStorage.setItem("sokrates_current_pdf", JSON.stringify(pdfData));

    // Load cached summaries and history from SQLite stores
    const cachedProf = db.getSummary(doc.id, "professional");
    const cachedStudent = db.getSummary(doc.id, "student");
    const cachedExam = db.getSummary(doc.id, "exam");
    const chatLogs = db.getQuestionsForDocument(doc.id);
    const testLogs = db.getTestsForDocument(doc.id);

    const mappedChats = chatLogs.map(q => [
      { id: q.id + "_q", role: "user" as const, content: q.question_text, timestamp: new Date(q.created_at).toLocaleTimeString() },
      { id: q.id + "_a", role: "assistant" as const, content: q.answer_text, timestamp: new Date(q.created_at).toLocaleTimeString() }
    ]).flat();

    const mappedTests = testLogs.map(t => {
      try {
        const parsed = JSON.parse(t.test_json);
        return {
          id: t.id,
          difficulty: t.difficulty,
          questionCount: t.question_count,
          questions: parsed.questions || [],
          userAnswers: t.user_answers ? JSON.parse(t.user_answers) : {},
          score: t.score,
          date: new Date(t.created_at).toLocaleDateString("tr-TR")
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean) as any[];

    const syncAnalysis: SavedAnalysis = {
      fileName: doc.file_name,
      summary: cachedProf?.summary_text,
      studentExplainer: cachedStudent?.summary_text,
      examNotes: cachedExam?.summary_text,
      chatHistory: mappedChats,
      tests: mappedTests
    };

    setSavedAnalysis(syncAnalysis);
    localStorage.setItem(`sokrates_analysis_${doc.file_name}`, JSON.stringify(syncAnalysis));
    setActiveTab("analysis"); // Move instantly to analysis panel
  };

  // Truncate text utility
  const truncate = (text: string, count: number) => {
    if (text.length <= count) return text;
    return text.substring(0, count) + "...";
  };

  // Copy output to clipboard helper
  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Server API proxy helper for Gemini Prompts
  const runGeminiAction = async (promptType: string, customPromptText?: string) => {
    if (!currentPDF) {
      setApiError("Lütfen önce bir PDF dosyası seçin.");
      return;
    }

    if (!isOnline) {
      setApiError("İnternet bağlantınız bulunmamaktadır. Gemini işlemleri için internet bağlantısı kurulmalıdır.");
      return;
    }

    setApiError(null);
    setIsProcessing(true);
    setProcessType(promptType);

    try {
      // Find document ID inside the database matching currentPDF.fileName
      const docs = db.getDocuments();
      let matchDoc = docs.find(d => d.file_name === currentPDF.fileName);
      
      // If none matches (highly unlikely, but safe callback), register it
      if (!matchDoc) {
        const outcome = await PdfService.processPDF(new File([currentPDF.extractedText], currentPDF.fileName, { type: "application/pdf" }));
        matchDoc = outcome.doc;
      }
      
      const docId = matchDoc.id;
      let outputStr = "";

      if (promptType === "summary") {
        outputStr = await summaryService.getSummaryByType(docId, "professional", settings.apiKey);
        updateSavedAnalysis({ summary: outputStr });
      } else if (promptType === "student") {
        outputStr = await summaryService.getSummaryByType(docId, "student", settings.apiKey);
        updateSavedAnalysis({ studentExplainer: outputStr });
      } else if (promptType === "exam") {
        outputStr = await summaryService.getSummaryByType(docId, "exam", settings.apiKey);
        updateSavedAnalysis({ examNotes: outputStr });
      } else if (promptType === "chat") {
        const questionText = customPromptText || chatInput || "";
        outputStr = await questionService.askQuestion(docId, questionText, settings.apiKey);
        
        const assistantId = "assistant-" + Date.now();
        const nextHist = savedAnalysis?.chatHistory || [];
        const finalHist: ChatMessage[] = [
          ...nextHist,
          { 
            id: assistantId, 
            role: "assistant", 
            content: outputStr, 
            timestamp: new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }) 
          }
        ];
        updateSavedAnalysis({ chatHistory: finalHist });
      } else if (promptType === "solve") {
        const questionText = customPromptText || "";
        outputStr = await questionService.solveComplexQuestion(docId, questionText, settings.apiKey);

        const assistantId = "solve-" + Date.now();
        const nextHist = savedAnalysis?.chatHistory || [];
        const finalHist: ChatMessage[] = [
          ...nextHist,
          { 
            id: "user-solve-" + Date.now(), 
            role: "user", 
            content: `Soru Çözümü İsteği: "${customPromptText}"`, 
            timestamp: new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }) 
          },
          { 
            id: assistantId, 
            role: "assistant", 
            content: outputStr, 
            timestamp: new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }) 
          }
        ];
        updateSavedAnalysis({ chatHistory: finalHist });
        setActiveTab("chat"); // Direct them to chat view to read the extensive solver breakdown!
      }

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Yapay zeka ile iletişim sağlanamadı.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Server API proxy helper for Generating Interactive Test Schema
  const runGenerateTest = async () => {
    if (!currentPDF) {
      setApiError("Lütfen önce bir PDF dosyası yükleyin.");
      return;
    }

    if (!isOnline) {
      setApiError("Sınav testi üretebilmek için internet bağlantınız açık olmalıdır.");
      return;
    }

    setApiError(null);
    setIsProcessing(true);
    setProcessType("test");

    try {
      const docs = db.getDocuments();
      let matchDoc = docs.find(d => d.file_name === currentPDF.fileName);
      if (!matchDoc) {
        const outcome = await PdfService.processPDF(new File([currentPDF.extractedText], currentPDF.fileName, { type: "application/pdf" }));
        matchDoc = outcome.doc;
      }

      const docId = matchDoc.id;
      const testResult = await testService.createTest(docId, testCount, testDifficulty, settings.apiKey);

      const freshTest: SavedTest = {
        id: testResult.id,
        difficulty: testDifficulty,
        questionCount: testCount,
        questions: testResult.questions || [],
        userAnswers: {},
        date: new Date().toLocaleDateString("tr-TR") + " - " + new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
      };

      const pastTests = savedAnalysis?.tests || [];
      const updatedTests = [freshTest, ...pastTests];
      updateSavedAnalysis({ tests: updatedTests });
      setActiveTest(freshTest);

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Etkileşimli test üretilirken bir API hatası oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit User Chat Question
  const handleSendChat = () => {
    if (!chatInput.trim() || !currentPDF) return;
    
    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: chatInput,
      timestamp: new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })
    };

    const nextHist = [...(savedAnalysis?.chatHistory || []), userMsg];
    updateSavedAnalysis({ chatHistory: nextHist });
    const userText = chatInput;
    setChatInput("");

    // Call server async
    runGeminiAction("chat", userText);
  };

  // Trigger quick presets in Chat input field
  const applyPresetQuestion = (text: string) => {
    setChatInput(text);
  };

  // Interactive Test choice selection
  const handleSelectOption = (questionId: number, optionLetter: string) => {
    if (!activeTest) return;
    
    // Check if test was already graded (i.e., has a score)
    if (activeTest.score !== undefined) return;

    const newAnswers = { ...activeTest.userAnswers, [questionId]: optionLetter };
    const updatedTest = { ...activeTest, userAnswers: newAnswers };
    
    // Update active state
    setActiveTest(updatedTest);

    // Write back into persistent array
    if (savedAnalysis) {
      const restTests = savedAnalysis.tests.map(t => t.id === activeTest.id ? updatedTest : t);
      updateSavedAnalysis({ tests: restTests });
    }
  };

  // Grade interactive test results
  const gradeActiveTest = () => {
    if (!activeTest) return;

    let correctCount = 0;
    activeTest.questions.forEach(q => {
      // Find matches. Extracted letter is first character or match strictly against A, B, C, D
      const selected = activeTest.userAnswers[q.id];
      if (selected && (selected === q.correctAnswer || selected.startsWith(q.correctAnswer))) {
        correctCount++;
      }
    });

    const scorePct = Math.round((correctCount / activeTest.questions.length) * 100);
    const updatedTest: SavedTest = { ...activeTest, score: scorePct, timeTaken: testTimeElapsed };
    setActiveTest(updatedTest);

    // Save scored result directly within the persistence SQLite-like DB log
    try {
      testService.submitTestAnswers(activeTest.id, activeTest.userAnswers, scorePct, testTimeElapsed);
      db.updateStudyStats(activeTest.documentId || "global", testTimeElapsed, activeTest.questions.length, scorePct);
      refreshStudyStats();
    } catch (e) {
      console.error("Failed to commit test scores to databaseService:", e);
    }

    if (savedAnalysis) {
      const restTests = savedAnalysis.tests.map(t => t.id === activeTest.id ? updatedTest : t);
      updateSavedAnalysis({ tests: restTests });
    }
  };

  // Trigger Gemini to extract interactive Flashcards from PDF
  const handleGenerateFlashcards = async () => {
    if (!currentPDF) return;
    if (!isOnline) {
      setApiError("Hafıza kartı üretebilmek için internet bağlantınız açık olmalıdır.");
      return;
    }

    setApiError(null);
    setIsGeneratingFlashcards(true);

    try {
      const allDocs = db.getDocuments();
      let matchingDoc = allDocs.find(d => d.file_name === currentPDF.fileName);
      if (!matchingDoc) {
        const outcome = await PdfService.processPDF(new File([currentPDF.extractedText], currentPDF.fileName, { type: "application/pdf" }));
        matchingDoc = outcome.doc;
      }

      const cards = await gemini.extractFlashcards(matchingDoc.id, settings.apiKey);
      if (cards && cards.length > 0) {
        setFlashcards(cards);
        updateSavedAnalysis({ flashcards: cards });
      } else {
        setApiError("Dosyadan hafıza kartı terimleri çıkarılamadı.");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Hafıza kartları üretilirken beklenmedik bir hata meydana geldi.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleToggleCardMemorized = (cardId: string) => {
    const updatedCards = flashcards.map(fc => {
      if (fc.id === cardId) {
        return { ...fc, memorized: !fc.memorized };
      }
      return fc;
    });
    setFlashcards(updatedCards);
    updateSavedAnalysis({ flashcards: updatedCards });
  };

  const handleResetFlashcardProgress = () => {
    const updatedCards = flashcards.map(fc => ({ ...fc, memorized: false }));
    setFlashcards(updatedCards);
    updateSavedAnalysis({ flashcards: updatedCards });
    setActiveFlashcardIndex(0);
    setIsFlashcardFlipped(false);
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} sn`;
    return `${m} dk ${s} sn`;
  };

  const getSuccessTrendData = () => {
    if (!savedAnalysis || !savedAnalysis.tests) return [];
    
    // Reverse so we go from oldest to newest for chronological trend line
    const gradedOnly = [...savedAnalysis.tests]
      .filter(t => t.score !== undefined)
      .reverse()
      .slice(-10);
      
    return gradedOnly.map((test, index) => ({
      name: `${index + 1}. Sınav`,
      Puan: test.score || 0,
      Süre: test.timeTaken ? formatDuration(test.timeTaken) : "N/A"
    }));
  };

  // Load a historic test session
  const selectHistoricTest = (test: SavedTest) => {
    setActiveTest(test);
  };

  // Reset/Unload current active test selection
  const startNewTestSetup = () => {
    setActiveTest(null);
  };

  // Remove completely cached metrics
  const triggerClearAllSaved = () => {
    if (confirm("Bu PDF dosyasına ait kaydedilmiş tüm analiz, özet ve çözülmüş testleri kalıcı olarak silmek istediğinize emin misiniz?")) {
      if (currentPDF) {
        localStorage.removeItem(`sokrates_analysis_${currentPDF.fileName}`);
        setSavedAnalysis({
          fileName: currentPDF.fileName,
          chatHistory: [],
          tests: []
        });
      }
    }
  };

  // Reset or Unbind current active PDF document completely to upload another
  const resetActiveDocument = () => {
    if (confirm("Mevcut PDF dokümanı bağlantısını kesip ana ekrana dönmek istiyor musunuz? (Kaydedilmiş analizleriniz silinmeyecek, daha sonra tekrar açabilirsiniz)")) {
      setCurrentPDF(null);
      setSavedAnalysis(null);
      localStorage.removeItem("sokrates_current_pdf");
      setActiveTab("home");
    }
  };

  // Calculate study recommendation based on the length or content of active PDF
  const getDailySuggestionText = () => {
    if (!currentPDF) {
      return "Sokrates'e hemen bir ders notu PDF'i yükleyerek güne hızlı başla!";
    }
    const pagesRange = currentPDF.pageCount;
    if (pagesRange <= 3) {
      return `Bu kısa 3 sayfalık not için bugün "Öğrenci Gibi Anlat" modunu çalıştırıp, ardından 5 soruluk mini bir Kolay Test çözerek tüm konuyu hafızaya alabilirsin.`;
    } else if (pagesRange <= 8) {
      return `Bugün bu orta ölçekli (${pagesRange} sayfa) dokümanı "Profesyonel Özetle" moduna sokup önemli başlıkları kopyala. Notlarınla 10 soruluk Orta seviye test yap!`;
    } else {
      return `Bu geniş kapsamlı ${pagesRange} sayfalık dokümanı adım adım parçala. Bugün ilk %30'luk bölümü okuyup "Sınavda Çıkacak Yerler" butonuyla yapay zeka koçundan tüyo al.`;
    }
  };

  const isDarkMode = theme === "dark";

  return (
    <MobileFrame theme={theme} toggleTheme={toggleTheme}>
      {/* Scrollable Container Wrapper with safe flex bounds */}
      <div className={`flex flex-col flex-1 h-full font-sans transition-colors duration-300 ${isDarkMode ? "bg-[#070913] text-gray-100" : "bg-slate-50 text-slate-800"}`}>
        
        {/* Offline Guard Header Banner */}
        {!isOnline && (
          <div className="bg-amber-600/90 text-white px-4 py-2 text-[11px] font-medium text-center flex items-center justify-center gap-1.5 shrink-0 shadow-md">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Mevcut durum çevrimdışıdır. Çevrimdışı kayıtlı özetleri görebilirsiniz ancak yeni yapay zeka analizi için internet gereklidir.</span>
          </div>
        )}

        {/* Global Error Banner Panel - User Friendly */}
        {apiError && (
          <div className="bg-red-500/15 border-b border-red-500/20 text-red-400 px-4 py-2.5 text-xs flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button 
              onClick={() => setApiError(null)} 
              className={`p-1 rounded hover:bg-red-500/10 text-xs font-bold font-mono`}
            >
              OK
            </button>
          </div>
        )}

        {/* PDF Extraction Overlay loader */}
        {extractProgress.status !== "idle" && extractProgress.status !== "completed" && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-400 animate-spin">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">PDF Analiz Ediliyor</h3>
            <p className="text-xs text-gray-400 max-w-xs">{extractProgress.message}</p>
            {extractProgress.totalPages > 0 && (
              <div className="w-48 bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${(extractProgress.currentPage / extractProgress.totalPages) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Global API Loading Ring Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50">
            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <h3 className="text-sm font-semibold text-white">Sokrates Düşünüyor...</h3>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 max-w-xs">
              {processType === "summary" && "Akademik PDF özetiniz çıkartılıyor. Bu işlem birkaç saniye sürebilir."}
              {processType === "student" && "Eğitim asistanı konuyu basitleştiriyor, öğrenci moduna odaklanılıyor."}
              {processType === "exam" && "Sınavda çıkma olasılığı yüksek yerler tespit ediliyor."}
              {processType === "chat" && "Cevap üretiliyor..."}
              {processType === "test" && "Çoktan seçmeli interaktif quiz soruları paketleniyor."}
              {processType === "solve" && "Detaylı adım adım öğretmen çözümü planlanıyor."}
            </p>
          </div>
        )}

        {/* ------------------------- PAGE SWITCHER INNER LOGIC ------------------------- */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* PAGE 1: "HOME" */}
          {activeTab === "home" && (
            <HomeScreen
              onStartTimer={handleStartTimerFromShortcut}
              onStartQuiz={() => setActiveTab("quiz")}
              isDarkMode={theme === "dark"}
            />
          )}

          {/* PAGE 1.5: "TIMER" */}
          {activeTab === "timer" && (
            <FocusTimerScreen
              onSuccess={handleTimerSuccess}
              isDarkMode={theme === "dark"}
              preselectedSubjectId={shortcutSubjectId}
              preselectedTopicId={shortcutTopicId}
            />
          )}

          {/* PAGE 1.6: "COACH" */}
          {activeTab === "coach" && (
            <GeminiCoachScreen
              isDarkMode={theme === "dark"}
            />
          )}

          {/* PAGE 1.7: "STATS" */}
          {activeTab === "stats" && (
            <StatsScreen
              isDarkMode={theme === "dark"}
            />
          )}

          {/* PAGE 1.8: "FLASHCARDS" - REPLACED WITH MISTAKE ANALYSIS */}
          {activeTab === "flashcards" && (
            <MistakeAnalysisScreen />
          )}

          {/* PAGE 1.9: "QUIZ" - MODERN MOBILE-FRIENDLY HISTORY QUIZ */}
          {activeTab === "quiz" && (
            <QuizScreen isDarkMode={theme === "dark"} />
          )}

          {/* DEPRECATED INLINE HOME SCREEN BLOCK */}
          {false && activeTab === "home" && (
            <div className="p-5 flex flex-col gap-5 flex-1">
              {/* Header Title section */}
              <div id="header-section" className="flex justify-between items-start mt-2 animate-fade-in-down">
                <div>
                  <h1 className={`text-3xl font-extrabold tracking-[-0.02em] flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    Sokrates <span className="text-indigo-400 font-semibold">Asistanı</span>
                  </h1>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    PDF yükle, konuyu anla, soru çöz.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 active-pulse"></span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Gemini Active</span>
                </div>
              </div>

              {/* PDF Dropbox Area */}
              <div 
                id="pdf-upload-card"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-[24px] p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  dragActive 
                    ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]" 
                    : isDarkMode 
                      ? "border-white/10 bg-[#0d1125]/60 hover:border-indigo-500/40 hover:bg-indigo-500/5 shadow-inner" 
                      : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50 shadow-sm"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 transition-colors ${
                  isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-500"
                }`}>
                  <Upload className="w-7 h-7" />
                </div>

                <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/10 active:scale-95 transition-all mb-2 cursor-pointer">
                  PDF Dosyası Yükle
                </button>
                <p className={`text-[11px] leading-relaxed max-w-[210px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Ders notu, sınav PDF’i, duyuru veya doküman yükleyebilirsin.
                </p>
              </div>

              {/* Status information of PDF */}
              {currentPDF ? (() => {
                const matchDoc = db.getDocuments().find(d => d.file_name === currentPDF.fileName);
                return (
                  <div className="flex flex-col gap-2.5">
                    {/* Primary File Info */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isDarkMode 
                        ? "bg-[#0d1125]/60 border-white/5" 
                        : "bg-white border-slate-200/80 shadow-sm"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">YÜKLENEN BELGE</span>
                        <button 
                          onClick={resetActiveDocument} 
                          className="text-[10px] font-semibold text-red-400 hover:underline cursor-pointer"
                        >
                          Bağlantıyı Kes
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-inner">
                          PDF
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs font-bold truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            {currentPDF.fileName}
                          </h4>
                          <p className={`text-[10px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {currentPDF.pageCount} Sayfa • {currentPDF.fileSize}
                          </p>
                        </div>
                        <button 
                          onClick={() => setActiveTab("analysis")}
                          className="p-1 px-3 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-[11px] font-bold flex items-center gap-0.5 select-none cursor-pointer"
                        >
                          <span>Devam Et</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quality Assessment display metrics card */}
                    <div className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                      isDarkMode ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200/50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Belge Kalite Raporu (QA)</span>
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Okunabilirlik: {matchDoc ? matchDoc.readability : "Yüksek"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className={`p-2 rounded-xl border ${isDarkMode ? "bg-[#0d1125]/40 border-white/5" : "bg-white border-slate-200/50"}`}>
                          <span className="text-gray-500 block text-[8px] uppercase font-semibold">🔍 Tahmini Konu</span>
                          <span className={`font-bold block mt-0.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            {matchDoc?.detected_subject || "Genel İnceleme"}
                          </span>
                        </div>
                        <div className={`p-2 rounded-xl border ${isDarkMode ? "bg-[#0d1125]/40 border-white/5" : "bg-white border-slate-200/50"}`}>
                          <span className="text-gray-500 block text-[8px] uppercase font-semibold">📊 Belge Türü</span>
                          <span className={`font-bold block mt-0.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            {matchDoc?.document_type || "Çalışma Notu"}
                          </span>
                        </div>
                      </div>

                      {matchDoc?.ocr_needed && (
                        <p className="text-[9.5px] text-amber-500 bg-amber-500/5 border border-amber-500/10 p-2 rounded-xl leading-relaxed">
                          ⚠️ <strong>Tarama Görsel Belge Algılandı:</strong> Bu PDF içerisinde düz metin tespiti zayıf yapıldı. Formül ve denklemlerin en isabetli çözülümü için ayarlardan <strong>Kaliteli Mod</strong> modeline geçmeniz önerilir.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()
              : (
                <div className="flex flex-col gap-4">
                  {/* Empty state warning card lock quick actions */}
                  <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                    isDarkMode ? "bg-amber-500/5 border-amber-500/15" : "bg-amber-50 border-amber-200"
                  }`}>
                    <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`} />
                    <div className="text-[10.5px] leading-relaxed text-amber-500/90 font-medium">
                      Hızlı işlem butonlarını aktif hale getirmek için yukarıdaki alandan bir ders veya sınav PDF’i yüklemeniz gerekir.
                    </div>
                  </div>

                  {/* SQLite Document Archive History Section */}
                  {db.getDocuments().length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
                          Son Yüklenen Ders Belgeleri
                        </h3>
                        <span className="text-[10px] text-indigo-400 font-semibold font-mono">Arşiv ({db.getDocuments().length})</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {db.getDocuments().slice(0, 4).map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => reloadHistoricDocument(doc)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-all ${
                              isDarkMode 
                                ? "bg-black/20 hover:bg-indigo-500/5 border-white/5 hover:border-indigo-500/20" 
                                : "bg-slate-50 hover:bg-indigo-50/50 border-slate-200/60 hover:border-indigo-500/20"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-7 h-7 shrink-0 bg-red-500/10 border border-red-500/10 text-red-400 rounded-lg flex items-center justify-center text-[9px] font-black font-sans">
                                PDF
                              </div>
                              <div className="truncate flex-1">
                                <h4 className={`text-[11px] font-bold truncate ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                  {doc.file_name}
                                </h4>
                                <span className="text-[9px] text-gray-500">
                                  {doc.page_count} Sayfa • {doc.file_size} • {doc.detected_subject || "Genel"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Operations Button Grid */}
              <div className="flex flex-col gap-2.5">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
                  Hızlı Çalışma İşlemleri
                </h3>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Profesyonel Özetle Card */}
                  <button
                    disabled={!currentPDF}
                    onClick={() => {
                      setActiveTab("analysis");
                      if (savedAnalysis && !savedAnalysis.summary) {
                        runGeminiAction("summary");
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 select-none transition-all ${
                      currentPDF 
                        ? isDarkMode 
                          ? "bg-indigo-950/20 hover:bg-indigo-950/40 border-white/5" 
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "opacity-40 cursor-not-allowed border-black/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                      ★
                    </div>
                    <div>
                      <div className={`text-[12px] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Profesyonel Özetle</div>
                      <p className={`text-[9.5px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Akademik & detaylı</p>
                    </div>
                  </button>

                  {/* Öğrenci Gibi Anlat Card */}
                  <button
                    disabled={!currentPDF}
                    onClick={() => {
                      setActiveTab("analysis");
                      if (savedAnalysis && !savedAnalysis.studentExplainer) {
                        runGeminiAction("student");
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 select-none transition-all ${
                      currentPDF 
                        ? isDarkMode 
                          ? "bg-indigo-950/20 hover:bg-indigo-950/40 border-white/5" 
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "opacity-40 cursor-not-allowed border-black/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                      🎓
                    </div>
                    <div>
                      <div className={`text-[12px] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Öğrenci Dili</div>
                      <p className={`text-[9.5px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Basit analojili</p>
                    </div>
                  </button>

                  {/* Sınav Modu Card */}
                  <button
                    disabled={!currentPDF}
                    onClick={() => {
                      setActiveTab("analysis");
                      if (savedAnalysis && !savedAnalysis.examNotes) {
                        runGeminiAction("exam");
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 select-none transition-all ${
                      currentPDF 
                        ? isDarkMode 
                          ? "bg-indigo-950/20 hover:bg-indigo-950/40 border-white/5" 
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "opacity-40 cursor-not-allowed border-black/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                      🔍
                    </div>
                    <div>
                      <div className={`text-[12px] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Kritik Sınav</div>
                      <p className={`text-[9.5px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Sorular ve tuzaklar</p>
                    </div>
                  </button>

                  {/* PDF’e Soru Sor */}
                  <button
                    disabled={!currentPDF}
                    onClick={() => {
                      setActiveTab("chat");
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 select-none transition-all ${
                      currentPDF 
                        ? isDarkMode 
                          ? "bg-indigo-950/20 hover:bg-indigo-950/40 border-white/5" 
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "opacity-40 cursor-not-allowed border-black/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      💬
                    </div>
                    <div>
                      <div className={`text-[12px] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>PDF'e Soru Sor</div>
                      <p className={`text-[9.5px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Sohbet & Keşif</p>
                    </div>
                  </button>

                  {/* Test Üret */}
                  <button
                    disabled={!currentPDF}
                    onClick={() => {
                      setActiveTab("test");
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 select-none transition-all ${
                      currentPDF 
                        ? isDarkMode 
                          ? "bg-indigo-950/20 hover:bg-indigo-950/40 border-white/5" 
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "opacity-40 cursor-not-allowed border-black/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                      📝
                    </div>
                    <div>
                      <div className={`text-[12px] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Test Üret</div>
                      <p className={`text-[9.5px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Düzeyli ve çözümlü</p>
                    </div>
                  </button>

                  {/* Soru Çözümü */}
                  <button
                    disabled={!currentPDF}
                    onClick={() => {
                      setShowSolverMenu(!showSolverMenu);
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 select-none transition-all ${
                      currentPDF 
                        ? isDarkMode 
                          ? "bg-indigo-950/20 hover:bg-[#12183c] border-white/5" 
                          : "bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                        : "opacity-40 cursor-not-allowed border-black/5"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center shrink-0">
                      ✅
                    </div>
                    <div>
                      <div className={`text-[12px] font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Adım Adım Çöz</div>
                      <p className={`text-[9.5px] mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Soruyu gönder çözsün</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Expandable Solve Modal/Form inside list */}
              {showSolverMenu && currentPDF && (
                <div className={`p-4 rounded-2xl border animate-fadeIn ${
                  isDarkMode ? "bg-black/40 border-indigo-500/30" : "bg-white border-indigo-200"
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-indigo-400">Öğretmen Soru Çözümleyici</h4>
                    <button onClick={() => setShowSolverMenu(false)} className="text-[10px] text-gray-500">Kapat</button>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                    Yazılı sorunuzu veya test sorusunun metnini aşağıya yazın. Sokrates soruyu çözüp tüm şık analiziyle birlikte Chat ekranında açıklayacak!
                  </p>
                  <textarea
                    rows={3}
                    value={customSolveInput}
                    onChange={(e) => setCustomSolveInput(e.target.value)}
                    placeholder="Örnek: Aşağıdakilerden hangisi mitokondri geninin temel özelliklerindendir?"
                    className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none transition-colors ${
                      isDarkMode ? "bg-black/40 border-white/10 text-gray-200" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                  <button
                    disabled={!customSolveInput.trim() || isProcessing}
                    onClick={() => {
                      runGeminiAction("solve", customSolveInput);
                      setCustomSolveInput("");
                      setShowSolverMenu(false);
                    }}
                    className={`mt-2.5 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hemen Çözdür</span>
                  </button>
                </div>
              )}

              {/* Study Progress overview dashboard */}
              <div className={`p-5 rounded-[28px] border shrink-0 ${
                isDarkMode ? "bg-[#0d1125]/75 border-white/5" : "bg-white border-slate-200/80 shadow-sm"
              } flex flex-col gap-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <div className="text-left">
                      <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                        Çalışma İlerlemesi
                      </h3>
                      <p className="text-[9.5px] text-gray-500">Öğrenme ve sınav istatistiklerin</p>
                    </div>
                  </div>

                  {/* Toggle between Global and Doc level if currentPDF is loaded */}
                  {currentPDF && (
                    <div className={`p-0.5 rounded-lg flex border text-[9px] font-bold ${
                      isDarkMode ? "bg-black/45 border-white/5" : "bg-slate-100 border-slate-200"
                    }`}>
                      <button
                        onClick={() => refreshStudyStats()}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          !docStudyStats ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-400"
                        }`}
                      >
                        Genel
                      </button>
                      <button
                        onClick={() => {
                          const matchDoc = db.getDocuments().find(d => d.file_name === currentPDF.fileName);
                          if (matchDoc) {
                            setDocStudyStats(db.getStudyStats(matchDoc.id));
                          }
                        }}
                        className={`px-2 py-1 rounded-md transition-all truncate max-w-[80px] cursor-pointer ${
                          docStudyStats ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-400"
                        }`}
                      >
                        Bu Belge
                      </button>
                    </div>
                  )}
                </div>

                {/* Show stats grid */}
                {(() => {
                  const statsObj = docStudyStats || studyStats;
                  const scoreColor = statsObj?.average_score >= 80 
                    ? "text-emerald-400" 
                    : statsObj?.average_score >= 50 
                      ? "text-indigo-400" 
                      : "text-amber-500";
                      
                  return (
                    <div className="flex flex-col gap-3.5">
                      {/* Grid Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-2xl border text-left ${
                          isDarkMode ? "bg-black/30 border-white/5" : "bg-slate-50/50 border-slate-100"
                        }`}>
                          <span className="text-[9px] uppercase font-semibold text-gray-500 block">⏱ Toplam Süre</span>
                          <span className={`text-xs font-extrabold block mt-0.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            {formatDuration(statsObj?.cumulative_study_time || 0)}
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-left ${
                          isDarkMode ? "bg-black/30 border-white/5" : "bg-slate-50/50 border-slate-100"
                        }`}>
                          <span className="text-[9px] uppercase font-semibold text-gray-500 block">🎯 Çözülen Soru</span>
                          <span className={`text-xs font-extrabold block mt-0.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            {statsObj?.total_questions_answered || 0} Soru
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-left ${
                          isDarkMode ? "bg-black/30 border-white/5" : "bg-slate-50/50 border-slate-100"
                        }`}>
                          <span className="text-[9px] uppercase font-semibold text-gray-500 block">📝 Sınav Sayısı</span>
                          <span className={`text-xs font-extrabold block mt-0.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                            {statsObj?.total_tests_completed || 0} Adet
                          </span>
                        </div>

                        <div className={`p-3 rounded-2xl border text-left ${
                          isDarkMode ? "bg-black/30 border-white/5" : "bg-slate-50/50 border-slate-100"
                        }`}>
                          <span className="text-[9px] uppercase font-semibold text-gray-500 block">📈 Başarı Oranı</span>
                          <span className={`text-xs font-extrabold block mt-0.5 ${scoreColor}`}>
                            %{statsObj?.average_score || 0}
                          </span>
                        </div>
                      </div>

                      {/* Score range horizontal gauge indicator */}
                      <div className={`p-3 rounded-2xl border text-left ${
                        isDarkMode ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-100"
                      }`}>
                        <div className="flex justify-between items-center text-[9px] text-gray-500 mb-1.5 font-bold uppercase">
                          <span>Sınav Başarı Baremi</span>
                          <span className={scoreColor}>%{statsObj?.average_score || 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-700/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                            style={{ width: `${statsObj?.average_score || 0}%` }}
                          ></div>
                        </div>
                        {statsObj?.last_activity_at && (
                          <div className="text-[8px] text-gray-500 text-right mt-1.5 font-mono">
                            Son Çalışma: {new Date(statsObj.last_activity_at).toLocaleString("tr-TR")}
                          </div>
                        )}
                      </div>

                      {/* Interactive Manual Log of study hours & Reset Section */}
                      <div className="flex flex-col gap-1.5 mt-1 border-t border-dashed border-gray-700/25 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] uppercase font-extrabold text-gray-400">Okuma Çalışmanı Ekle</span>
                          <button
                            onClick={() => {
                              if (confirm("Seçili çalışma istatistiklerinizi sıfırlamak istediğinize emin misiniz?")) {
                                const targetId = docStudyStats ? docStudyStats.id : "global";
                                const fresh = {
                                  id: targetId,
                                  cumulative_study_time: 0,
                                  total_questions_answered: 0,
                                  total_tests_completed: 0,
                                  average_score: 0,
                                  last_activity_at: ""
                                };
                                db.saveStudyStats(fresh);
                                refreshStudyStats();
                              }
                            }}
                            className="text-[9px] font-bold text-red-500 hover:text-red-400 hover:underline cursor-pointer"
                          >
                            İstatistikleri Sıfırla
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mt-1">
                          {[5, 15, 30, 60].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => {
                                const targetId = docStudyStats ? docStudyStats.id : "global";
                                db.addManualStudyTime(targetId, mins * 60);
                                refreshStudyStats();
                              }}
                              className={`py-1 rounded-lg border text-[10px] font-black cursor-pointer shadow-sm active:scale-95 transition-all text-center ${
                                isDarkMode 
                                  ? "bg-indigo-950/20 hover:bg-indigo-950/45 border-white/5 text-indigo-400 hover:text-indigo-300" 
                                  : "bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-700 hover:text-indigo-800"
                              }`}
                            >
                              +{mins} dk
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Working Tip Idea Card */}
              <div className="mt-auto bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/10 rounded-[28px] p-4.5 flex gap-4 items-center">
                <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/10 rounded-xl flex items-center justify-center text-2xl shrink-0 select-none">
                  💡
                </div>
                <div>
                  <h4 className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-widest">Çalışma Önerisi</h4>
                  <p className={`text-[12px] font-medium leading-relaxed mt-0.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                    {getDailySuggestionText()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: "ANALYSIS" */}
          {activeTab === "analysis" && (
            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* Segmented Sub-tab Switcher for Premium Math Symbols vs Document Analysis */}
              <div className={`p-1 rounded-2xl grid grid-cols-2 shrink-0 border ${
                isDarkMode ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-200"
              }`}>
                <button
                  onClick={() => setAnalysisSubTab("pdf")}
                  className={`py-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    analysisSubTab === "pdf"
                      ? isDarkMode ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-900 shadow-sm"
                      : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ders Notu Özetleri</span>
                </button>
                <button
                  onClick={() => setAnalysisSubTab("library")}
                  className={`py-2 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    analysisSubTab === "library"
                      ? isDarkMode ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-900 shadow-sm"
                      : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-slate-800"
                  }`}
                >
                  <Variable className="w-3.5 h-3.5" />
                  <span>Sembol & Formül Kütüphanesi</span>
                </button>
              </div>

              {analysisSubTab === "library" ? (
                /* Subtab 1: Symbol and Formula Visual Library */
                <div className="flex-1 overflow-y-auto">
                  <SymbolLibrary isDarkMode={isDarkMode} />
                </div>
              ) : (
                /* Subtab 2: Standard Doküman Analizi */
                currentPDF ? (
                  <>
                    {/* File Metadata Info Box top */}
                    <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 tracking-tight shrink-0 ${
                      isDarkMode ? "bg-[#0d1125]/60 border-white/5" : "bg-white border-slate-200/80 shadow-sm"
                    }`}>
                      <div className="w-9 h-9 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center text-[10px] font-black">
                        PDF
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-xs font-bold truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                          {currentPDF.fileName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{currentPDF.pageCount} sayfa</span>
                          <span className="text-gray-600">•</span>
                          <span className={`text-[9px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{currentPDF.fileSize}</span>
                        </div>
                      </div>
                      <button 
                        onClick={resetActiveDocument} 
                        className={`text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5`}
                      >
                        Kapat
                      </button>
                    </div>

                    {/* Three-way Section Toggle Segmented Controls */}
                    <div className={`p-1 rounded-xl grid grid-cols-3 shrink-0 border text-[10px] uppercase font-black ${
                      isDarkMode ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200"
                    }`}>
                      <button
                        onClick={() => setAnalysisSection("summaries")}
                        className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                          analysisSection === "summaries"
                            ? isDarkMode ? "bg-indigo-600 text-white" : "bg-white text-slate-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-400"
                        }`}
                      >
                        Özetler
                      </button>
                      <button
                        onClick={() => setAnalysisSection("flashcards")}
                        className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                          analysisSection === "flashcards"
                            ? isDarkMode ? "bg-indigo-600 text-white" : "bg-white text-slate-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-400"
                        }`}
                      >
                        Kartlar
                      </button>
                      <button
                        onClick={() => setAnalysisSection("preview")}
                        className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                          analysisSection === "preview"
                            ? isDarkMode ? "bg-indigo-600 text-white" : "bg-white text-slate-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-400"
                        }`}
                      >
                        Önizleme
                      </button>
                    </div>

                    {analysisSection === "summaries" && (
                      <>
                        {/* Selector Tabs for specific AI prompt results */}
                        <div className="grid grid-cols-3 gap-1.5 shrink-0 select-none">
                          <button
                            onClick={() => {
                              if (!savedAnalysis?.summary && isOnline) runGeminiAction("summary");
                            }}
                            className={`py-2 text-[10.5px] font-bold rounded-xl transition-all ${
                              savedAnalysis?.summary 
                                ? isDarkMode 
                                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/25" 
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : isDarkMode 
                                  ? "bg-black/20 text-gray-400 border border-white/5 hover:bg-white/5" 
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/60"
                            }`}
                          >
                            Profesyonel Özet
                          </button>
                          <button
                            onClick={() => {
                              if (!savedAnalysis?.studentExplainer && isOnline) runGeminiAction("student");
                            }}
                            className={`py-2 text-[10.5px] font-bold rounded-xl transition-all ${
                              savedAnalysis?.studentExplainer 
                                ? isDarkMode 
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/25" 
                                  : "bg-orange-50 text-orange-700 border border-orange-200"
                                : isDarkMode 
                                  ? "bg-black/20 text-gray-400 border border-white/5 hover:bg-white/5" 
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/60"
                            }`}
                          >
                            Öğrenci Anlatımı
                          </button>
                          <button
                            onClick={() => {
                              if (!savedAnalysis?.examNotes && isOnline) runGeminiAction("exam");
                            }}
                            className={`py-2 text-[10.5px] font-bold rounded-xl transition-all ${
                              savedAnalysis?.examNotes 
                                ? isDarkMode 
                                  ? "bg-purple-500/10 text-purple-300 border border-purple-500/25" 
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                                : isDarkMode 
                                  ? "bg-black/20 text-gray-400 border border-white/5 hover:bg-white/5" 
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/60"
                            }`}
                          >
                            Kritik Sınav
                          </button>
                        </div>

                        {/* Output Rendering Dashboard */}
                        <div className="flex-1 flex flex-col min-h-0">
                          <div className={`p-4 rounded-3xl border flex-1 overflow-y-auto relative ${
                            isDarkMode ? "bg-[#0d1125]/30 border-white/5" : "bg-white border-slate-200/80 shadow-sm"
                          }`}>
                            
                            {/* Copy and Actions menu floats on top right */}
                            {(savedAnalysis?.summary || savedAnalysis?.studentExplainer || savedAnalysis?.examNotes) && (
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                                <button
                                  onClick={() => {
                                    const activeTxt = savedAnalysis.summary || savedAnalysis.studentExplainer || savedAnalysis.examNotes || "";
                                    handleCopy(activeTxt);
                                  }}
                                  className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors bg-black/60 border-white/10 text-gray-300 hover:text-white`}
                                  title="Sonucu Kopyala"
                                >
                                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={triggerClearAllSaved}
                                  className="p-1.5 rounded-lg border flex items-center justify-center bg-black/60 border-white/10 text-red-400 hover:bg-red-500/10"
                                  title="Verileri Temizle"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Content Render Brancher based on available states */}
                            {savedAnalysis?.summary || savedAnalysis?.studentExplainer || savedAnalysis?.examNotes ? (
                              <div className="space-y-6">
                                {savedAnalysis.summary && (
                                  <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                      Profesyonel Özet Modu
                                    </h3>
                                    <div className="pl-3.5 border-l border-indigo-500/20">
                                      <MarkdownView content={savedAnalysis.summary} />
                                    </div>
                                  </div>
                                )}

                                {savedAnalysis.studentExplainer && (
                                  <div className="space-y-2 pt-4 border-t border-white/5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                                      Öğrenci Dili Anlatım Akışı
                                    </h3>
                                    <div className="pl-3.5 border-l border-orange-400/20">
                                      <MarkdownView content={savedAnalysis.studentExplainer} />
                                    </div>
                                  </div>
                                )}

                                {savedAnalysis.examNotes && (
                                  <div className="space-y-2 pt-4 border-t border-white/5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                      Sınav Hedefli Kritik Analiz
                                    </h3>
                                    <div className="pl-3.5 border-l border-purple-400/20">
                                      <MarkdownView content={savedAnalysis.examNotes} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Standard Welcome empty trigger state inside analysis */
                              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3 animate-pulse">
                                  <Sparkles className="w-6 h-6" />
                                </div>
                                <h4 className={`text-xs font-bold mb-1.5 ${isDarkMode ? "text-white" : "text-indigo-300"}`}>
                                  Henüz Analiz Başlatılmadı
                                </h4>
                                <p className={`text-[10px] leading-relaxed max-w-[220px] mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  Yukarıdaki hızlı sekmeleri seçerek veya aşağıdaki butonlar ile Gemini modelinden istediğiniz formatta analizi başlatabilirsiniz.
                                </p>
                                
                                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                                  <button
                                    disabled={!isOnline}
                                    onClick={() => runGeminiAction("summary")}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-md shadow-indigo-600/15"
                                  >
                                    ★ Profesyonel Özet Çıkar
                                  </button>
                                  <button
                                    disabled={!isOnline}
                                    onClick={() => runGeminiAction("student")}
                                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-600/15"
                                  >
                                    🎓 Öğrenci Diliyle Anlat
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {analysisSection === "preview" && (
                      <div className="flex-1 flex flex-col min-h-0 gap-3.5">
                        {/* Page index search query */}
                        <div className="relative shrink-0">
                          <input
                            type="text"
                            value={pageSearchQuery}
                            onChange={(e) => setPageSearchQuery(e.target.value)}
                            placeholder="Önizlemeyle sayfalarda metin ara..."
                            className={`w-full py-2 pl-9 pr-3 text-[11px] rounded-2xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                              isDarkMode ? "bg-[#0d1125]/60 border-white/5 text-gray-200" : "bg-white border-slate-200 text-slate-800 font-medium"
                            }`}
                          />
                          <span className="absolute left-3.5 top-2.5 text-gray-500 text-[11px] select-none">🔍</span>
                        </div>

                        {/* Grid of Pages - Thumbnails visualizer list using native CSS render grids */}
                        <div className="shrink-0">
                          <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1.5 select-none text-left">Sayfa Listesi (Önizleme Listesi)</h4>
                          <div className="flex gap-2.5 p-1 overflow-x-auto select-none scrollbar-thin">
                            {activePages.map((p) => {
                              const pageNum = p.page_number;
                              const isSelected = selectedPageNum === pageNum;
                              const containsSearch = pageSearchQuery && p.clean_text.toLowerCase().includes(pageSearchQuery.toLowerCase());
                              
                              return (
                                <button
                                  key={p.id || pageNum}
                                  onClick={() => setSelectedPageNum(pageNum)}
                                  className={`p-2 rounded-2xl border shrink-0 w-14 flex flex-col justify-between items-center transition-all cursor-pointer relative ${
                                    isSelected
                                      ? isDarkMode ? "bg-indigo-600 border-indigo-400 text-white" : "bg-indigo-600 border-indigo-500 shadow-md text-white"
                                      : containsSearch
                                        ? isDarkMode ? "bg-amber-500/10 border-amber-400 text-yellow-300" : "bg-yellow-50 border-yellow-400 text-yellow-800"
                                        : isDarkMode ? "bg-[#0d1125]/40 border-white/5 text-gray-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {/* Page Sheet drawing */}
                                  <div className="w-8 h-10 border rounded flex flex-col gap-0.5 p-0.5 overflow-hidden border-current opacity-40 shrink-0">
                                    <div className="h-1 bg-current w-full rounded" />
                                    <div className="h-0.5 bg-current w-3/4 rounded" />
                                    <div className="h-0.5 bg-current w-1/2 rounded" />
                                    <div className="h-1 mt-auto bg-current w-full rounded" />
                                  </div>
                                  <span className="text-[9px] font-black mt-1">S. {pageNum}</span>
                                  {containsSearch && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-current shadow animate-pulse" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selected Page Text Viewer */}
                        <div className="flex-1 flex flex-col min-h-0">
                          {activePages.length > 0 ? (
                            (() => {
                              const activePage = activePages.find(p => p.page_number === selectedPageNum) || activePages[0];
                              const wordsCount = activePage.clean_text.split(/\s+/).length;
                              const readTime = Math.max(1, Math.round(wordsCount / 180));
                              
                              return (
                                <div className={`p-4 rounded-3xl border flex-1 flex flex-col min-h-0 relative ${
                                  isDarkMode ? "bg-[#0d1125]/30 border-white/5" : "bg-white border-slate-200 shadow-sm"
                                }`}>
                                  {/* Header Page Metrics */}
                                  <div className="flex justify-between items-center pb-2 border-b border-white/5 shrink-0 select-none">
                                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                                      Aktif Sayfa: {activePage.page_number} / {activePages.length}
                                    </span>
                                    <div className="flex gap-2 text-gray-500 text-[9px] font-medium font-mono">
                                      <span>{activePage.clean_text.length} karakter</span>
                                      <span>•</span>
                                      <span>≈ {readTime} dk okuma</span>
                                    </div>
                                  </div>

                                  {/* Page content scrollable view */}
                                  <div className="flex-1 overflow-y-auto pt-3 text-xs leading-relaxed font-sans font-medium whitespace-pre-wrap select-text selection:bg-indigo-500/20 text-left text-gray-300">
                                    {pageSearchQuery ? (
                                      activePage.clean_text.split(new RegExp(`(${pageSearchQuery})`, 'gi')).map((chunk, i) => 
                                        chunk.toLowerCase() === pageSearchQuery.toLowerCase() 
                                          ? <mark key={i} className="bg-yellow-500/40 text-yellow-200 py-0.5 rounded px-0.5 font-bold">{chunk}</mark>
                                          : chunk
                                      )
                                    ) : (
                                      activePage.clean_text
                                    )}
                                  </div>

                                  {/* Transfer action to chat classes */}
                                  <div className="pt-3 border-t border-white/5 shrink-0 flex justify-between items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setChatInput(`[S. ${activePage.page_number} Hakkında Sorum Var]: `);
                                        setActiveTab("chat");
                                      }}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-[10px] font-black rounded-xl cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>Bu Sayfayı Soru-Cevap Sınıfına Gönder</span>
                                    </button>
                                    <button
                                      onClick={() => handleCopy(activePage.clean_text)}
                                      className="p-1.5 rounded-lg border flex items-center justify-center transition-colors bg-black/60 border-white/10 text-gray-300 hover:text-white"
                                    >
                                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                              <p className="text-xs text-gray-500">Sayfa metni dökülürken bir sorun oluştu.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {analysisSection === "flashcards" && (
                      <div className="flex-1 flex flex-col min-h-0 gap-3.5">
                        {flashcards.length === 0 ? (
                          /* Generating state */
                          <div className={`p-6 rounded-3xl border flex-1 flex flex-col items-center justify-center text-center ${
                            isDarkMode ? "bg-[#0d1125]/30 border-white/5" : "bg-white border-slate-200 shadow-sm"
                          }`}>
                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center mb-3 text-lg">
                              ⚡
                            </div>
                            <h4 className={`text-xs font-bold mb-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                              Hafıza Kartları (Flashcards)
                            </h4>
                            <p className="text-[10px] text-gray-400 max-w-[240px] leading-relaxed mb-4">
                              Yüklediğiniz PDF'ten terim ve kavramları çekip bunları interaktif çalışma kartlarına dönüştürelim. Ezber yapmanın en pratik yolu!
                            </p>

                            <button
                              disabled={isGeneratingFlashcards || !isOnline}
                              onClick={handleGenerateFlashcards}
                              className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-indigo-600/15`}
                            >
                              {isGeneratingFlashcards ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Terimler Çıkarılıyor...</span>
                                </>
                              ) : (
                                <>
                                  <span>★ Hafıza Kartlarını Üret</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          /* Interactive Flashcard Slider */
                          <div className="flex-1 flex flex-col min-h-0 gap-3">
                            {(() => {
                              const totalCount = flashcards.length;
                              const learnedCount = flashcards.filter(fc => fc.memorized).length;
                              const currentCard = flashcards[activeFlashcardIndex] || flashcards[0];
                              const pct = Math.round((learnedCount / totalCount) * 100);

                              return (
                                <>
                                  <div className={`p-3.5 rounded-2xl border text-left ${
                                    isDarkMode ? "bg-[#0d1125]/30 border-white/5" : "bg-white border-slate-200 shadow-sm"
                                  }`}>
                                    <div className="flex justify-between items-center select-none text-[9.5px] font-black uppercase tracking-wider text-indigo-400 mb-1.5">
                                      <span>Konu Kavrama Seviyesi</span>
                                      <span>%{pct} ({learnedCount} / {totalCount} Ezberlendi)</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                                      <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Perspective Card Flipping View */}
                                  <div className="flex-1 flex flex-col justify-center items-center py-2 select-none">
                                    <div 
                                      className="w-full max-w-sm h-48 [perspective:1000px] cursor-pointer" 
                                      onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                                    >
                                      <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlashcardFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                                        {/* Front */}
                                        <div className="absolute inset-0 w-full h-full p-6 rounded-3xl bg-indigo-600 text-white flex flex-col justify-between [backface-visibility:hidden] shadow-lg shadow-indigo-600/10 border border-white/10">
                                          <span className="text-[9px] uppercase font-black tracking-widest text-indigo-300 text-left">Ön Yüz (Terim / Kavram)</span>
                                          <h3 className="text-sm font-black text-center my-auto leading-normal px-1">{currentCard.term}</h3>
                                          <p className="text-[8.5px] text-center text-indigo-200">Çevirmek ve tanımı okumak için kartın üzerine dokunun</p>
                                        </div>
                                        {/* Back */}
                                        <div className="absolute inset-0 w-full h-full p-6 rounded-3xl bg-[#0e122b] border border-indigo-500/20 text-gray-200 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-lg">
                                          <span className="text-[9px] uppercase font-black tracking-widest text-[#a855f7] text-left">Arka Yüz (Bilimsel Tanım)</span>
                                          <p className="text-[11px] text-center my-auto font-bold leading-relaxed px-2 text-gray-100 text-center">{currentCard.definition}</p>
                                          <p className="text-[8.5px] text-center text-gray-500">Tekrar ön yüze geçmek için dokunun</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action button toggling card memorized state */}
                                    <div className="flex gap-2 mt-4.5 w-full max-w-sm">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleCardMemorized(currentCard.id);
                                        }}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                                          currentCard.memorized
                                           ? "bg-emerald-600 text-white border-emerald-400"
                                           : isDarkMode 
                                             ? "bg-black/30 border-white/5 text-gray-400 hover:text-white" 
                                             : "bg-slate-50 text-slate-500 border-slate-200"
                                        }`}
                                      >
                                        {currentCard.memorized ? "✔ Ezberledim" : "Mark: Ezberledim"}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsFlashcardFlipped(!isFlashcardFlipped);
                                        }}
                                        className="p-2 w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-300 flex items-center justify-center cursor-pointer text-xs"
                                        title="Kartı Çevir"
                                      >
                                        🔄
                                      </button>
                                    </div>
                                  </div>

                                  {/* Slider Footers Navigation */}
                                  <div className="flex justify-between items-center pt-2.5 border-t border-white/5 shrink-0 select-none">
                                    <button
                                      disabled={activeFlashcardIndex === 0}
                                      onClick={() => {
                                        setActiveFlashcardIndex(prev => prev - 1);
                                        setIsFlashcardFlipped(false);
                                      }}
                                      className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all text-xs font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      ← Önceki
                                    </button>

                                    <div className="flex gap-2 items-center">
                                      <span className="text-[11px] text-gray-400 font-bold font-mono">
                                        {activeFlashcardIndex + 1} / {totalCount}
                                      </span>
                                      <button 
                                        onClick={handleResetFlashcardProgress}
                                        className="text-[10px] text-red-400 underline ml-1 cursor-pointer"
                                      >
                                        Sıfırla
                                      </button>
                                    </div>

                                    <button
                                      disabled={activeFlashcardIndex === totalCount - 1}
                                      onClick={() => {
                                        setActiveFlashcardIndex(prev => prev + 1);
                                        setIsFlashcardFlipped(false);
                                      }}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      Sonraki →
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* No PDF loaded alert back to home transition */
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-semibold">Doküman Bulunmamaktadır</h3>
                    <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                      Lütfen ana ekrandan geçerli bir ders dokümanı (.pdf) yükleyin ya da hemen aşağıdaki butondan formüller kütüphanesini keşfedin!
                    </p>
                    <div className="flex flex-col gap-2 mt-2 w-full max-w-[190px]">
                      <button
                        onClick={() => setAnalysisSubTab("library")}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
                      >
                        Sembolleri İncele
                      </button>
                      <button
                        onClick={() => setActiveTab("home")}
                        className="py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold rounded-xl border border-white/5 active:scale-95 transition-transform cursor-pointer"
                      >
                        PDF Yükleme Ekranına Git
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* PAGE 3: "CHAT" */}
          {activeTab === "chat" && (
            <div className="p-5 flex flex-col flex-1 min-h-0 gap-3.5">
              {currentPDF ? (
                <>
                  {/* Floating Small Mini-Title badge header */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between shrink-0 ${
                    isDarkMode ? "bg-black/30 border-white/5" : "bg-white border-slate-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      <span className="text-[10px] font-bold text-gray-400 truncate max-w-[190px]">
                        Konu: {currentPDF.fileName}
                      </span>
                    </div>
                    <button 
                      onClick={() => updateSavedAnalysis({ chatHistory: [] })} 
                      className="text-[9.5px] font-semibold text-gray-500 hover:text-red-400 flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Temizle
                    </button>
                  </div>

                  {/* Predefined prompt chip helpers on top of input */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none select-none">
                    <button 
                      onClick={() => applyPresetQuestion("Bu PDF'te en çok durulan en kıymetli 3 konu nedir?")}
                      className={`px-3 py-1 bg-white/5 border border-white/5 rounded-xl text-[10px] whitespace-nowrap hover:bg-indigo-500/15 hover:border-indigo-500/25 transition-all text-xs text-gray-300 font-medium cursor-pointer`}
                    >
                      💎 En önemli 3 konu
                    </button>
                    <button 
                      onClick={() => applyPresetQuestion("Bilinmesi gereken kritik kavramları tablo şeklinde özetler misin?")}
                      className={`px-3 py-1 bg-white/5 border border-white/5 rounded-xl text-[10px] whitespace-nowrap hover:bg-indigo-500/15 hover:border-indigo-500/25 transition-all text-xs text-gray-300 font-medium cursor-pointer`}
                    >
                      📊 Kavram Tablosu
                    </button>
                    <button 
                      onClick={() => applyPresetQuestion("Beni test etmek için bu PDF içeriğinden 3 tane zor soru sor.")}
                      className={`px-3 py-1 bg-white/5 border border-white/5 rounded-xl text-[10px] whitespace-nowrap hover:bg-indigo-500/15 hover:border-indigo-500/25 transition-all text-xs text-gray-300 font-medium cursor-pointer`}
                    >
                      🎯 Bana 3 soru sor
                    </button>
                    <button 
                      onClick={() => applyPresetQuestion("Akılda kalması için bana komik veya hikayeli bir benzetmeyle anlat.")}
                      className={`px-3 py-1 bg-white/5 border border-white/5 rounded-xl text-[10px] whitespace-nowrap hover:bg-indigo-500/15 hover:border-indigo-500/25 transition-all text-xs text-gray-300 font-medium cursor-pointer`}
                    >
                      🎭 Hikayeli benzetme
                    </button>
                  </div>

                  {/* Chat logs area */}
                  <div className={`flex-1 p-3.5 rounded-2xl border overflow-y-auto ${
                    isDarkMode ? "bg-[#0d1125]/30 border-white/5" : "bg-white border-slate-200/80 shadow-sm"
                  }`}>
                    {savedAnalysis?.chatHistory && savedAnalysis.chatHistory.length > 0 ? (
                      <div className="space-y-4">
                        {savedAnalysis.chatHistory.map((msg) => (
                          <div 
                            key={msg.id}
                            id={`chat-msg-${msg.id}`}
                            className={`flex flex-col max-w-[85%] ${
                              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                            }`}
                          >
                            <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "bg-indigo-600 text-white rounded-br-none"
                                : isDarkMode
                                  ? "bg-white/5 text-gray-200 rounded-bl-none border border-white/5"
                                  : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                            }`}>
                              <MarkdownView content={msg.content} />
                            </div>
                            <span className="text-[9px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Zero state chat greeting */
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">Ders Sohbet Odası</h4>
                        <p className="text-[10px] text-gray-400 max-w-[210px] leading-relaxed">
                          Yasadığınız tüm zorluklar, karmaşık denklemler veya ezberlemekte zorlandığınız kısımları Sokrates'e sorabilirsiniz.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Chat inputs footer bar */}
                  <div className="flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                      placeholder="PDF hakkında soru sor..."
                      className={`flex-1 py-3 px-4 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                        isDarkMode
                          ? "bg-black/30 border-white/10 text-gray-200 placeholder-gray-500 focus:border-indigo-500"
                          : "bg-white border-slate-200 text-slate-800 placeholder-gray-400 focus:border-indigo-500 shadow-sm"
                      }`}
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim() || isProcessing}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                /* No PDF loaded error link to home */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-semibold">PDF Yüklenmedi</h3>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Soru sormak ve PDF ile doğrudan sohbet edebilmek için lütfen ana sayfadan doküman seçin.
                  </p>
                  <button
                    onClick={() => setActiveTab("home")}
                    className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                  >
                    PDF Seç
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PAGE 4: "TEST / QUIZ" */}
          {activeTab === "test" && (
            <div className="p-5 flex flex-col flex-1 min-h-0 gap-4">
              {currentPDF ? (
                <>
                  {/* Sub Header setup selector when activeTest is null */}
                  {!activeTest ? (
                    <div className="flex-1 flex flex-col gap-4">
                      
                      {/* Interactive form container wrapper */}
                      <div className={`p-4 rounded-3xl border ${
                        isDarkMode ? "bg-[#0d1125]/60 border-white/5" : "bg-white border-slate-200 shadow-sm"
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
                            <PenTool className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-bold">Yeni Test Ayarları</h3>
                        </div>
                        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                          Yüklediğiniz PDF'in bağlamına göre yapay zekanın size özel hazırlayacağı soru ve cevap yapılandırmasını belirleyin.
                        </p>

                        {/* Question count selector */}
                        <div className="mb-4">
                          <label className="text-[11px] uppercase tracking-wide font-extrabold text-gray-400 mb-2 block">
                            Soru Sayısı
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[5, 10, 20].map((num) => (
                              <button
                                key={num}
                                onClick={() => setTestCount(num)}
                                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                                  testCount === num
                                    ? "bg-indigo-600 text-white"
                                    : isDarkMode
                                      ? "bg-black/40 text-gray-300 border border-white/5 hover:bg-white/5"
                                      : "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                {num} Soru
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Difficulty Selector */}
                        <div className="mb-5">
                          <label className="text-[11px] uppercase tracking-wide font-extrabold text-gray-400 mb-2 block">
                            Zorluk Derecesi
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["kolay", "orta", "zor"] as const).map((diff) => (
                              <button
                                key={diff}
                                onClick={() => setTestDifficulty(diff)}
                                className={`py-2 text-xs font-bold rounded-xl capitalize transition-all ${
                                  testDifficulty === diff
                                    ? diff === "kolay" ? "bg-emerald-600 text-white" : diff === "orta" ? "bg-amber-600 text-white" : "bg-rose-600 text-white"
                                    : isDarkMode
                                      ? "bg-black/40 text-gray-300 border border-white/5 hover:bg-white/5"
                                      : "bg-slate-100 text-slate-805 border border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                {diff}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Run generate test CTA button */}
                        <button
                          disabled={isProcessing}
                          onClick={runGenerateTest}
                          className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-rose-600/10 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Testleri Akıllıca Üret</span>
                        </button>
                      </div>

                      {/* Historic completed tests area */}
                      <div className="flex-1 flex flex-col overflow-y-auto">
                        
                        {/* Success Trend Chart (using recharts) */}
                        {savedAnalysis?.tests && savedAnalysis.tests.filter(t => t.score !== undefined).length > 0 && (
                          <div className={`p-4 rounded-3xl border mb-4 shrink-0 overflow-hidden ${
                            isDarkMode ? "bg-[#0d1125]/85 border-white/5" : "bg-white border-slate-200 shadow-sm"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-sm">📈</span>
                              <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Başarı Grafiği (Son 10 Sınav)</h3>
                            </div>
                            <div className="h-28 w-full mt-1.5 font-sans">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getSuccessTrendData()} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                  <XAxis dataKey="name" stroke="#6b7280" fontSize={8} tickLine={false} />
                                  <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={8} tickLine={false} axisLine={false} />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: isDarkMode ? "#0e1124" : "#ffffff", 
                                      borderColor: isDarkMode ? "#1f2937" : "#e5e7eb",
                                      borderRadius: "12px",
                                      fontSize: "10px"
                                    }} 
                                  />
                                  <Area type="monotone" dataKey="Puan" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Geçmiş Sınavlarım</h4>
                        
                        {savedAnalysis?.tests && savedAnalysis.tests.length > 0 ? (
                          <div className="space-y-2.5 overflow-y-auto pr-1">
                            {savedAnalysis.tests.map((test) => (
                              <button
                                key={test.id}
                                onClick={() => selectHistoricTest(test)}
                                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                  isDarkMode 
                                    ? "bg-black/40 border-white/5 hover:bg-[#0d1125]/80 hover:border-indigo-500/30" 
                                    : "bg-white border-slate-200 hover:bg-slate-50/85"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-extrabold shrink-0">
                                    {test.score !== undefined ? `${test.score}%` : "?"}
                                  </div>
                                  <div>
                                    <div className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                                      <span>{test.questionCount} Adet Soru</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold ${
                                        test.difficulty === "kolay" ? "bg-emerald-500/10 text-emerald-400" : test.difficulty === "orta" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-500"
                                      }`}>
                                        {test.difficulty}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-0.5">
                                      {test.date} {test.timeTaken !== undefined && `• ⏱ ${formatDuration(test.timeTaken)}`}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className={`p-6 border border-dashed rounded-2xl text-center flex flex-col items-center justify-center ${
                            isDarkMode ? "border-white/5 bg-black/10" : "border-slate-200 bg-slate-50/50"
                          }`}>
                            <p className="text-xs text-gray-400">Daha önce ürettiğiniz hiçbir test kaydı bulunamadı.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* ACTIVE INTERACTIVE TEST PANEL VIEW CONTAINER */
                    <div className="flex-1 flex flex-col min-h-0 gap-3.5">
                      {/* Active Test header with statistics */}
                      <div className="flex items-center justify-between shrink-0 mb-1">
                        <button 
                          onClick={startNewTestSetup}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10.5px] font-bold text-gray-400 flex items-center gap-1 cursor-pointer"
                        >
                          ← Geri Dön
                        </button>

                        {/* Live Timer Tracker if test is running, or historical duration display */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10.5px] font-extrabold tracking-wider">
                          <span className="animate-pulse">⏱</span>
                          <span>{activeTest.score === undefined ? formatDuration(testTimeElapsed) : (activeTest.timeTaken !== undefined ? formatDuration(activeTest.timeTaken) : "0 sn")}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-500">Zorluk:</span>
                          <span className={`uppercase font-extrabold px-1.5 py-0.5 rounded text-[10px] ${
                            activeTest.difficulty === "kolay" ? "bg-emerald-500/10 text-emerald-400" : activeTest.difficulty === "orta" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-500"
                          }`}>{activeTest.difficulty}</span>
                        </div>
                      </div>

                      {/* Dynamic Scollable Interactive Question Logs cards */}
                      <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                        {activeTest.questions.map((questionObj, idx) => {
                          const chosenAnswer = activeTest.userAnswers[questionObj.id];
                          const isGraded = activeTest.score !== undefined;
                          
                          // Determine if answer is correct or not if graded
                          // correctAnswer is typically "A" or "A) ...". Check startsWith.
                          const isCorrectChoice = isGraded && chosenAnswer === questionObj.correctAnswer;
                          const isAnswerCorrectIndex = isGraded && (chosenAnswer ? (chosenAnswer === questionObj.correctAnswer || chosenAnswer.startsWith(questionObj.correctAnswer)) : false);

                          return (
                            <div 
                              key={questionObj.id}
                              id={`test-q-card-${questionObj.id}`}
                              className={`p-4 rounded-2xl border ${
                                isDarkMode ? "bg-black/30 border-white/5 animate-fadeIn" : "bg-white border-slate-200 shadow-sm animate-fadeIn"
                              }`}
                            >
                              <div className="flex items-start gap-2.5 mb-2.5">
                                <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[11px] font-black rounded-lg shrink-0">
                                  {questionObj.id || idx + 1}
                                </span>
                                <h4 className={`text-xs font-bold leading-relaxed ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>
                                  {questionObj.question}
                                </h4>
                              </div>

                              {/* Radio choices grids */}
                              <div className="grid grid-cols-1 gap-2">
                                {questionObj.options.map((option, keyId) => {
                                  // Find label character matching letter (usually A, B, C, D)
                                  const optionLetter = option.trim().substring(0, 1).toUpperCase();
                                  const isSelected = chosenAnswer === optionLetter;
                                  
                                  // Graded styling checks
                                  let btnClass = isDarkMode 
                                    ? "bg-black/40 border-white/5 hover:bg-white/5 text-gray-300"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800";
                                  
                                  if (isSelected && !isGraded) {
                                    btnClass = "bg-indigo-600/10 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/20";
                                  }

                                  if (isGraded) {
                                    const isThisCorrect = questionObj.correctAnswer === optionLetter || option.startsWith(questionObj.correctAnswer);
                                    if (isThisCorrect) {
                                      btnClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold ring-1 ring-emerald-500/20";
                                    } else if (isSelected && !isThisCorrect) {
                                      btnClass = "bg-red-500/10 border-red-500/40 text-red-400 ring-1 ring-red-500/20";
                                    } else {
                                      btnClass += " opacity-50";
                                    }
                                  }

                                  return (
                                    <button
                                      key={keyId}
                                      onClick={() => handleSelectOption(questionObj.id, optionLetter)}
                                      disabled={isGraded}
                                      className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                                    >
                                      <span>{option}</span>
                                      {/* Indicator markers */}
                                      {isSelected && !isGraded && (
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                      )}
                                      {isGraded && (questionObj.correctAnswer === optionLetter || option.startsWith(questionObj.correctAnswer)) && (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Explanation block card if graded */}
                              {isGraded && (
                                <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-1 ${
                                  isDarkMode ? "bg-indigo-950/20 border-indigo-500/15" : "bg-indigo-50/50 border-indigo-100"
                                }`}>
                                  <div className="flex items-center gap-1">
                                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6366f1]">Çözüm Açıklaması:</span>
                                  </div>
                                  <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
                                    {questionObj.explanation}
                                  </p>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>

                      {/* Interactive grading or total calculation footers */}
                      <div className="shrink-0 pt-1">
                        {activeTest.score === undefined ? (
                          <button
                            onClick={gradeActiveTest}
                            disabled={Object.keys(activeTest.userAnswers).length < activeTest.questions.length}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Testi Tamamla & Sonuçları Gör</span>
                          </button>
                        ) : (
                          <div className={`p-3.5 rounded-2xl border text-center flex items-center justify-between ${
                            activeTest.score >= 70 ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
                          }`}>
                            <div className="text-left">
                              <h4 className="text-xs font-bold">Sınav Puanı: %{activeTest.score}</h4>
                              {activeTest.timeTaken !== undefined && (
                                <p className="text-[9.5px] font-black text-indigo-400 uppercase tracking-wider mt-0.5">⏱ Çözüm Süresi: {formatDuration(activeTest.timeTaken)}</p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                                {activeTest.score >= 80 ? "Harika başarı! PDF içeriğini neredeyse mükemmel kavramışsın." : "Hata yaptığın soruların altındaki çözüm açıklamalarını dikkatlice incele."}
                              </p>
                            </div>
                            <button
                              onClick={startNewTestSetup}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl active:scale-95 transition-all"
                            >
                              Yeni Sınav Kur
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </>
              ) : (
                /* No PDF loaded error link to home */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400">
                    <PenTool className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-semibold">Test Üreticisi Kilitli</h3>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Sistemden hedeflenmiş sınav soruları, interaktif çözümler ve testler üretebilmek için lütfen önce bir PDF ders notu yükleyin.
                  </p>
                  <button
                    onClick={() => setActiveTab("home")}
                    className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Hemen PDF Yükle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PAGE 5: "SETTINGS" */}
          {activeTab === "settings" && (
            <SettingsScreen
              onSettingsChange={handleSettingsChangeInApp}
              isDarkMode={theme === "dark"}
              onToggleTheme={handleToggleThemeInApp}
            />
          )}

        </div>

        {/* ------------------------- BOTTOM ANDROID NAVIGATION TAB SYSTEM ------------------------- */}
        <nav className={`w-full grid grid-cols-8 border-t shrink-0 select-none z-30 transition-all ${
          isDarkMode 
            ? "bg-[#0b0c16]/95 border-white/5 shadow-[0_-5px_20px_rgba(0,0,0,0.4)]" 
            : "bg-white/95 border-slate-200/80 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]"
        }`}>
          {/* 1. Home Tab */}
          <button
            onClick={() => setActiveTab("home")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "home" ? "text-indigo-400 font-extrabold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">🏠</span>
            <span className="text-[8px] font-bold tracking-tight">Giriş</span>
          </button>

          {/* 2. Timer Tab */}
          <button
            onClick={() => setActiveTab("timer")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "timer" ? "text-indigo-400 font-extrabold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">⏱</span>
            <span className="text-[8px] font-bold tracking-tight">Sayaç</span>
          </button>

          {/* 3. Coach Tab */}
          <button
            onClick={() => setActiveTab("coach")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "coach" ? "text-indigo-400 font-extrabold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">🧠</span>
            <span className="text-[8px] font-bold tracking-tight">Koç</span>
          </button>

          {/* 4. Analysis Tab */}
          <button
            onClick={() => setActiveTab("analysis")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "analysis" || activeTab === "chat" || activeTab === "test"
                ? "text-indigo-400 font-extrabold" 
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <div className="relative">
              <span className="text-sm select-none">📚</span>
              {currentPDF && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
              )}
            </div>
            <span className="text-[8px] font-bold tracking-tight">Belge</span>
          </button>

          {/* 5. Stats Tab */}
          <button
            onClick={() => setActiveTab("stats")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "stats" ? "text-indigo-450 font-extrabold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">📊</span>
            <span className="text-[8px] font-bold tracking-tight">Rapor</span>
          </button>

          {/* 6. Quiz Tab */}
          <button
            onClick={() => setActiveTab("quiz")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "quiz" ? "text-amber-400 font-extrabold scale-105" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">📝</span>
            <span className="text-[8px] font-bold tracking-tight">Quiz</span>
          </button>

          {/* 7. Soru-Cevap Yanlış Analiz Defteri Tab */}
          <button
            onClick={() => setActiveTab("flashcards")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "flashcards" ? "text-red-400 font-extrabold scale-105" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">🎯</span>
            <span className="text-[8px] font-bold tracking-tight">Y. Defteri</span>
          </button>

          {/* 8. Settings Tab */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-2.5 flex flex-col items-center justify-center gap-1 select-none transition-transform cursor-pointer ${
              activeTab === "settings" ? "text-indigo-400 font-extrabold" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-sm select-none">⚙️</span>
            <span className="text-[8px] font-bold tracking-tight">Ayar</span>
          </button>
        </nav>

      </div>
    </MobileFrame>
  );
}
