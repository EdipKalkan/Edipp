import { 
  Theme, 
  ExplanationMode, 
  AppSettings, 
  PDFDoc, 
  ChatMessage, 
  SavedAnalysis, 
  TestQuestion, 
  SavedTest, 
  Flashcard,
  DB_Subject,
  DB_Topic,
  DB_StudySession,
  GeoStudyMarker,
  DB_Mistake
} from "../types";

export interface DB_Document {
  id: string;
  title: string;
  file_name: string;
  file_size: string;
  page_count: number;
  created_at: string;
  updated_at: string;
  document_type: string; // e.g. "Ders Notu", "Erişilebilir Makale", "Slayt"
  detected_subject: string; // e.g. "Matematik", "Fizik", "Tarih"
  language: string;
  last_opened_at: string;
  readability: "Yüksek" | "Orta" | "Düşük";
  ocr_needed: boolean;
  raw_text_length: number;
}

export interface DB_DocumentPage {
  id: string; // document_id + "_" + page_number
  document_id: string;
  page_number: number;
  raw_text: string;
  clean_text: string;
  ocr_used: boolean;
  created_at: string;
}

export interface DB_DocumentChunk {
  id: string; // document_id + "_" + chunk_index
  document_id: string;
  page_start: number;
  page_end: number;
  chunk_index: number;
  chunk_text: string;
  chunk_summary: string;
  keywords: string[];
  embedding_placeholder?: number[];
  created_at: string;
}

export interface DB_DocumentSummary {
  id: string; // document_id + "_" + summary_type
  document_id: string;
  summary_type: "short" | "detailed" | "student" | "exam" | "professional" | "flashcards";
  model_used: string;
  summary_text: string;
  created_at: string;
}

export interface DB_Question {
  id: string;
  document_id: string;
  question_text: string;
  answer_text: string;
  source_pages: string;
  model_used: string;
  created_at: string;
}

export interface DB_GeneratedTest {
  id: string;
  document_id: string;
  difficulty: "kolay" | "orta" | "zor";
  question_count: number;
  test_json: string;
  answer_key: string;
  user_answers?: string;
  score?: number;
  time_taken?: number;
  created_at: string;
}

export interface DB_StudyNote {
  id: string;
  document_id?: string;
  subject_id?: string;
  note_title: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export interface DB_ApiUsageLog {
  id: string;
  operation_type: string;
  model_used: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

export interface DB_UserStudyStats {
  id: string; // "global" or document_id
  cumulative_study_time: number; // in seconds
  total_questions_answered: number;
  total_tests_completed: number;
  average_score: number;
  last_activity_at: string;
}

export interface DB_AppSettings {
  gemini_api_key: string;
  selected_model: "gemini-3.1-flash-lite" | "gemini-3.5-flash" | "gemini-2.5-flash" | "gemini-3.1-pro-preview";
  answer_language: string;
  explanation_level: "Ekonomik" | "Dengeli" | "Kaliteli";
  theme: "dark" | "light";
  economy_mode_enabled: boolean;
}

// Default settings conforming to gemini-api directives
const DEFAULT_SETTINGS: DB_AppSettings = {
  gemini_api_key: "",
  selected_model: "gemini-3.1-flash-lite", // conform to gemini-api: Econ flash lite
  answer_language: "tr",
  explanation_level: "Ekonomik",
  theme: "dark",
  economy_mode_enabled: true
};

// Seed Data
const DEFAULT_SUBJECTS: DB_Subject[] = [
  { id: "sub_mat", name: "Matematik", exam_type: "TYT/AYT", color: "#6366F1", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "sub_tur", name: "Türkçe", exam_type: "TYT", color: "#EF4444", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "sub_cog", name: "Coğrafya", exam_type: "TYT/AYT", color: "#10B981", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "sub_fiz", name: "Fizik", exam_type: "AYT", color: "#F59E0B", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "sub_tar", name: "Tarih", exam_type: "TYT/AYT", color: "#8B5CF6", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const DEFAULT_TOPICS: DB_Topic[] = [
  // Matematik
  { id: "top_mat_1", subject_id: "sub_mat", name: "Problemler", description: "Oran-orantı, sayı, yaş, yüzde ve karışım problemleri", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "top_mat_2", subject_id: "sub_mat", name: "Sayılar", description: "Temel kavramlar, bölünebilme, asal sayılar ve rasyonel sayılar", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "top_mat_3", subject_id: "sub_mat", name: "Fonksiyonlar", description: "Fonksiyon grafikleri, bileşke ve ters fonksiyon işlemleri", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Türkçe
  { id: "top_tur_1", subject_id: "sub_tur", name: "Paragraf Sonuç/Ana Düşünce", description: "Metin yorumlama ve paragrafta ana fikir çıkarımı", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "top_tur_2", subject_id: "sub_tur", name: "Dil Bilgisi", description: "Sözcük türleri, cümle ögeleri ve ses bilgisi kuralları", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  // Coğrafya
  { id: "top_cog_1", subject_id: "sub_cog", name: "Harita Bilgisi ve Ölçekler", description: "Projeksiyon yöntemleri, izohips eğrileri ve haritadan profil çıkarma", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "top_cog_2", subject_id: "sub_cog", name: "Türkiye'nin Yerşekilleri", description: "Türkiye'deki ovalar, platolar, akarsular ve kıyı şekilleri (Sınavda her yıl çıkar)", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "top_cog_3", subject_id: "sub_cog", name: "İklim Tipleri ve Özellikleri", description: "Makroklima iklimleri ve Türkiye'nin yerel mikroklima alanları", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// High-yield examiner targets in Geography classes (TYT/AYT)
const DEFAULTS_GEO_MARKERS: GeoStudyMarker[] = [
  {
    id: "geo_mentese",
    title: "Menteşe Dağlık Yöresi (Muğla)",
    type: "dağ",
    lat: 37.2,
    lng: 28.3,
    importance: "Menteşe Dağları kıyıya paralel uzandığı için dağlık, engebeli ve ulaşım zordur; bu nedenle nüfus çok seyrektir. Ancak nemli deniz rüzgarlarına açık olduğu için bol yağış alır.",
    details: "TYT-AYT Ortak Soru Tarzı: 'Türkiye'nin en çok yağış alan ama engebeli olduğu için seyrek nüfuslu yöresi neresidir?' sorusunun klasik cevabıdır."
  },
  {
    id: "geo_tuzgolu",
    title: "Tuz Gölü Havzası",
    type: "göl",
    lat: 38.8,
    lng: 33.3,
    importance: "Türkiye'nin en az yağış alan, kuraklık ve erozyon riskinin en yüksek olduğu kapalı havzasıdır.",
    details: "Yıllık yağış miktarı 300 mm'nin altındadır. Bitki örtüsü son derece zayıftır (Antropojen bozkır/step). Karstik sızmalar ve buharlaşma gölü küçültür."
  },
  {
    id: "geo_cukurova",
    title: "Çukurova Delta Ovası (Adana)",
    type: "ova",
    lat: 36.8,
    lng: 35.3,
    importance: "Seyhan ve Ceyhan nehirlerinin taşıdığı alüvyonlarla oluşmuş Türkiye'nin en büyük alüvyal delta ovasıdır. Verimli toprakları sayesinde yılda birden çok ürün alınabilir.",
    details: "Sınavda akarsu biriktirme şekillerine en büyük örnektir. Yoğun nüfuslu, gelişmiş endüstriyel tarım bölgesidir."
  },
  {
    id: "geo_cilo",
    title: "Cilo Dağları (Hakkari)",
    type: "dağ",
    lat: 37.5,
    lng: 44.0,
    importance: "Türkiye'nin güncel glasyal (buzul) kalıntıları ve sirk göllerinin yer aldığı en yüksek tektonik dağ sırasıdır. Çok engebeli olduğu için nüfus aşırı seyrektir.",
    details: "Sınavda sıkça 'Türkiye'de güncel buzullara nerede rastlanır?' veya 'Karasal iklimin en sert geçtiği doğu sınır dağı hangisidir?' diye sorulmaktadır."
  },
  {
    id: "geo_istanbul_bogazi",
    title: "İstanbul Boğazı",
    type: "boğaz",
    lat: 41.1,
    lng: 29.0,
    importance: "Karadeniz ticaretini Akdeniz ve dünyaya bağlayan en stratejik deniz geçididir. Doğal liman özelliği (Haliç) taşır ve kıtaların kavşak noktasıdır.",
    details: "Jeopolitik konum sorularının vazgeçilmezidir. Heyelan veya karstik aşınma değil, deniz istilası (Ria kıyı tipi) ile oluşmuştur."
  },
  {
    id: "geo_canakkale_bogazi",
    title: "Çanakale Boğazı",
    type: "boğaz",
    lat: 40.2,
    lng: 26.4,
    importance: "Ege ve Marmara denizlerini birleştiren stratejik boğaz. Rüzgar enerjisi potansiyeli çok yüksektir.",
    details: "Ria kıyı tipine sahip olup, jeopolitik önemi büyüktür. Çanakkale Boğazı çevresi engebelidir, bu yüzden nüfus sanılanın aksine seyrektir."
  },
  {
    id: "geo_bafra",
    title: "Bafra ve Çarşamba Deltaları",
    type: "ova",
    lat: 41.5,
    lng: 36.2,
    importance: "Kızılırmak ve Yeşilırmak nehirlerinin Karadeniz'e döküldüğü yerde oluşturduğu verimli Karadeniz delta ovalarıdır.",
    details: "Kıyı vadi derinliklerinin az olduğu, gel-git etkisinin olmadığı alanlarda kıyı biriktirmesinin Karadeniz'deki en tipik temsilcisidir."
  },
  {
    id: "geo_vangolu",
    title: "Van Gölü Havzası",
    type: "göl",
    lat: 38.6,
    lng: 43.0,
    importance: "Nemrut yanardağının patlaması sonucu lavların akarsu vadisini kapatmasıyla oluşmuş volkanik set gölüdür. Suları yüksek oranda sodalıdır.",
    details: "Türkiye'nin en büyük gölüdür. Sodyum karbonat (soda) oranı sebebiyle mikrobiyalit oluşumları fazladır ve balıkçılık zordur (İnci Kefali yaşar)."
  }
];

class DatabaseService {
  // In-memory indexing tables for optimized, instant performance scaling
  private _studySessionsIndexed: DB_StudySession[] | null = null;
  private _chunksIndexedMap: Map<string, DB_DocumentChunk[]> = new Map();
  private _allChunksCached: DB_DocumentChunk[] | null = null;

  // Multi-column index mapping structures for highly optimized query lookups
  private _studySessionsBySubjectAndTopicIndex = new Map<string, DB_StudySession[]>();
  private _studySessionsByCreatedAtIndex = new Map<string, DB_StudySession[]>();
  private _documentChunksSubIndex = new Map<string, DB_DocumentChunk>();

  constructor() {
    this.initSeeds();
  }

  private getStorageKey(key: string): string {
    return `sokrates_db_${key}`;
  }

  private loadList<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(key));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error loading table ${key}:`, e);
      return [];
    }
  }

  public saveList<T>(key: string, list: T[]): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(list));
      // Indexing triggers
      if (key === "study_sessions") {
        const sessions = list as unknown as DB_StudySession[];
        this._studySessionsIndexed = sessions;

        // Rebuild subject_id, topic_id and created_at composite indices
        this._studySessionsBySubjectAndTopicIndex.clear();
        this._studySessionsByCreatedAtIndex.clear();

        sessions.forEach(sess => {
          // Composite index key: (subject_id, topic_id)
          const compKey = `${sess.subject_id || "none"}_${sess.topic_id || "none"}`;
          if (!this._studySessionsBySubjectAndTopicIndex.has(compKey)) {
            this._studySessionsBySubjectAndTopicIndex.set(compKey, []);
          }
          this._studySessionsBySubjectAndTopicIndex.get(compKey)!.push(sess);

          // Index key: created_at / started_at date
          const dateKey = sess.started_at ? sess.started_at.split("T")[0] : "unknown";
          if (!this._studySessionsByCreatedAtIndex.has(dateKey)) {
            this._studySessionsByCreatedAtIndex.set(dateKey, []);
          }
          this._studySessionsByCreatedAtIndex.get(dateKey)!.push(sess);
        });
      } else if (key === "document_chunks") {
        const chunkList = list as unknown as DB_DocumentChunk[];
        this._allChunksCached = chunkList;
        this._chunksIndexedMap.clear();
        this._documentChunksSubIndex.clear();

        chunkList.forEach(chunk => {
          let docChunks = this._chunksIndexedMap.get(chunk.document_id);
          if (!docChunks) {
            docChunks = [];
            this._chunksIndexedMap.set(chunk.document_id, docChunks);
          }
          docChunks.push(chunk);

          // Composite Index key: (document_id, chunk_index)
          const chunkSubKey = `${chunk.document_id}_${chunk.chunk_index}`;
          this._documentChunksSubIndex.set(chunkSubKey, chunk);
        });

        this._chunksIndexedMap.forEach(cl => {
          cl.sort((a, b) => a.chunk_index - b.chunk_index);
        });
      }
    } catch (e) {
      console.error(`Error saving table ${key}:`, e);
    }
  }

  // High-performance Index Query Lookups
  public getStudySessionsBySubjectAndTopic(subjectId: string, topicId?: string): DB_StudySession[] {
    this.getStudySessions(); // Ensures memory index is populated
    const compKey = `${subjectId}_${topicId || "none"}`;
    return this._studySessionsBySubjectAndTopicIndex.get(compKey) || [];
  }

  public getStudySessionsByDate(dateStr: string): DB_StudySession[] {
    this.getStudySessions(); // Ensures memory index is populated
    return this._studySessionsByCreatedAtIndex.get(dateStr) || [];
  }

  public getChunkByDocumentAndIndex(documentId: string, chunkIndex: number): DB_DocumentChunk | undefined {
    this.getAllChunks(); // Ensures memory index is populated
    const key = `${documentId}_${chunkIndex}`;
    return this._documentChunksSubIndex.get(key);
  }

  private initSeeds(): void {
    // If subjects empty, seed
    if (this.loadList("subjects").length === 0) {
      this.saveList("subjects", DEFAULT_SUBJECTS);
    }
    // If topics empty, seed
    if (this.loadList("topics").length === 0) {
      this.saveList("topics", DEFAULT_TOPICS);
    }
    // If geo markers empty, seed
    if (this.loadList("geo_markers").length === 0) {
      this.saveList("geo_markers", DEFAULTS_GEO_MARKERS);
    }
  }

  // ==========================================
  // App Settings
  // ==========================================
  getSettings(): DB_AppSettings {
    try {
      const data = localStorage.getItem(this.getStorageKey("app_settings"));
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error("Error reading settings:", e);
    }
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings: DB_AppSettings): void {
    try {
      localStorage.setItem(this.getStorageKey("app_settings"), JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }

  // ==========================================
  // Subjects Store
  // ==========================================
  getSubjects(): DB_Subject[] {
    return this.loadList<DB_Subject>("subjects");
  }

  addSubject(subject: DB_Subject): void {
    const list = this.getSubjects();
    list.push(subject);
    this.saveList("subjects", list);
  }

  // ==========================================
  // Topics Store
  // ==========================================
  getTopics(subjectId?: string): DB_Topic[] {
    const list = this.loadList<DB_Topic>("topics");
    if (subjectId) {
      return list.filter(t => t.subject_id === subjectId);
    }
    return list;
  }

  addTopic(topic: DB_Topic): void {
    const list = this.loadList<DB_Topic>("topics");
    list.push(topic);
    this.saveList("topics", list);
  }

  // ==========================================
  // Study Sessions (Focus Timer Sessions)
  // ==========================================
  getStudySessions(): DB_StudySession[] {
    if (this._studySessionsIndexed === null) {
      this._studySessionsIndexed = this.loadList<DB_StudySession>("study_sessions")
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    }
    return this._studySessionsIndexed;
  }

  addStudySession(session: DB_StudySession): void {
    const list = this.getStudySessions();
    list.push(session);
    this.saveList("study_sessions", list);

    // Also update statistics
    const stats = this.getStudyStats("global");
    stats.cumulative_study_time += session.duration_seconds;
    stats.last_activity_at = new Date().toISOString();
    this.saveStudyStats(stats);
  }

  deleteStudySession(id: string): void {
    const list = this.getStudySessions();
    this.saveList("study_sessions", list.filter(item => item.id !== id));
  }

  // Helper calculation arrays for graphs
  getTodayStudyTimeSeconds(): number {
    const sessions = this.getStudySessions();
    const todayStr = new Date().toISOString().split("T")[0];
    return sessions
      .filter(s => s.started_at.startsWith(todayStr))
      .reduce((acc, curr) => acc + curr.duration_seconds, 0);
  }

  getWeeklyStudyTimeSeconds(): number {
    const sessions = this.getStudySessions();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return sessions
      .filter(s => new Date(s.started_at).getTime() >= oneWeekAgo)
      .reduce((acc, curr) => acc + curr.duration_seconds, 0);
  }

  // Returns { subjectName: string, minutes: number } list for the AI Coach prompt
  getStudySummaryForAI(): { subject_name: string; total_minutes: number }[] {
    const sessions = this.getStudySessions();
    const subjects = this.getSubjects();
    
    // Last 7 days
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => new Date(s.started_at).getTime() >= oneWeekAgo);

    const breakdown: Record<string, number> = {};
    recentSessions.forEach(s => {
      breakdown[s.subject_id] = (breakdown[s.subject_id] || 0) + s.duration_seconds;
    });

    return subjects.map(sub => ({
      subject_name: sub.name,
      total_minutes: Math.round((breakdown[sub.id] || 0) / 60)
    })).filter(item => item.total_minutes > 0);
  }

  // ==========================================
  // Geography Study Markers
  // ==========================================
  getGeoMarkers(): GeoStudyMarker[] {
    return this.loadList<GeoStudyMarker>("geo_markers");
  }

  // ==========================================
  // Document PDF Store
  // ==========================================
  getDocuments(): DB_Document[] {
    return this.loadList<DB_Document>("documents")
      .sort((a, b) => new Date(b.last_opened_at).getTime() - new Date(a.last_opened_at).getTime());
  }

  addDocument(doc: DB_Document): void {
    const list = this.getDocuments();
    const existingIdx = list.findIndex(d => d.id === doc.id);
    if (existingIdx >= 0) {
      list[existingIdx] = doc;
    } else {
      list.push(doc);
    }
    this.saveList("documents", list);
  }

  updateDocumentLastOpened(id: string): void {
    const list = this.getDocuments();
    const doc = list.find(d => d.id === id);
    if (doc) {
      doc.last_opened_at = new Date().toISOString();
      this.saveList("documents", list);
    }
  }

  deleteDocumentComplete(id: string): void {
    this.saveList("documents", this.getDocuments().filter(d => d.id !== id));
    this.saveList("document_pages", this.getAllPages().filter(p => p.document_id !== id));
    this.saveList("document_chunks", this.getAllChunks().filter(c => c.document_id !== id));
    this.saveList("document_summaries", this.getAllSummaries().filter(s => s.document_id !== id));
    this.saveList("questions", this.getAllQuestions().filter(q => q.document_id !== id));
    this.saveList("generated_tests", this.getAllTests().filter(t => t.document_id !== id));
    this.saveList("study_notes", this.getAllNotes().filter(n => n.document_id !== id));
    this.saveList("user_study_stats", this.loadList<DB_UserStudyStats>("user_study_stats").filter(s => s.id !== id));
  }

  // ==========================================
  // Document Pages
  // ==========================================
  private getAllPages(): DB_DocumentPage[] {
    return this.loadList<DB_DocumentPage>("document_pages");
  }

  getPagesForDocument(documentId: string): DB_DocumentPage[] {
    return this.getAllPages()
      .filter(p => p.document_id === documentId)
      .sort((a, b) => a.page_number - b.page_number);
  }

  addPages(pages: DB_DocumentPage[]): void {
    const all = this.getAllPages();
    pages.forEach(p => {
      const idx = all.findIndex(item => item.id === p.id);
      if (idx >= 0) all[idx] = p;
      else all.push(p);
    });
    this.saveList("document_pages", all);
  }

  // ==========================================
  // Document Chunks
  // ==========================================
  private getAllChunks(): DB_DocumentChunk[] {
    if (this._allChunksCached === null) {
      this._allChunksCached = this.loadList<DB_DocumentChunk>("document_chunks");
    }
    return this._allChunksCached;
  }

  getChunksForDocument(documentId: string): DB_DocumentChunk[] {
    if (this._chunksIndexedMap.size === 0) {
      const all = this.getAllChunks();
      all.forEach(chunk => {
        let docChunks = this._chunksIndexedMap.get(chunk.document_id);
        if (!docChunks) {
          docChunks = [];
          this._chunksIndexedMap.set(chunk.document_id, docChunks);
        }
        docChunks.push(chunk);
      });
      this._chunksIndexedMap.forEach(cl => {
        cl.sort((a, b) => a.chunk_index - b.chunk_index);
      });
    }
    return this._chunksIndexedMap.get(documentId) || [];
  }

  addChunks(chunks: DB_DocumentChunk[]): void {
    const all = this.getAllChunks();
    chunks.forEach(c => {
      const idx = all.findIndex(item => item.id === c.id);
      if (idx >= 0) all[idx] = c;
      else all.push(c);
    });
    this.saveList("document_chunks", all);
  }

  // ==========================================
  // Document Summaries & Cache
  // ==========================================
  private getAllSummaries(): DB_DocumentSummary[] {
    return this.loadList<DB_DocumentSummary>("document_summaries");
  }

  getSummary(documentId: string, type: DB_DocumentSummary["summary_type"]): DB_DocumentSummary | undefined {
    return this.getAllSummaries().find(s => s.document_id === documentId && s.summary_type === type);
  }

  addSummary(summary: DB_DocumentSummary): void {
    const all = this.getAllSummaries();
    const idx = all.findIndex(s => s.document_id === summary.document_id && s.summary_type === summary.summary_type);
    if (idx >= 0) {
      all[idx] = summary;
    } else {
      all.push(summary);
    }
    this.saveList("document_summaries", all);
  }

  // ==========================================
  // Questions Info
  // ==========================================
  private getAllQuestions(): DB_Question[] {
    return this.loadList<DB_Question>("questions");
  }

  getQuestionsForDocument(documentId: string): DB_Question[] {
    return this.getAllQuestions().filter(q => q.document_id === documentId);
  }

  addQuestion(q: DB_Question): void {
    const all = this.getAllQuestions();
    all.push(q);
    this.saveList("questions", all);
  }

  // ==========================================
  // Generated Tests
  // ==========================================
  private getAllTests(): DB_GeneratedTest[] {
    return this.loadList<DB_GeneratedTest>("generated_tests");
  }

  getTestsForDocument(documentId: string): DB_GeneratedTest[] {
    return this.getAllTests()
      .filter(t => t.document_id === documentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addTest(test: DB_GeneratedTest): void {
    const all = this.getAllTests();
    const idx = all.findIndex(t => t.id === test.id);
    if (idx >= 0) all[idx] = test;
    else all.push(test);
    this.saveList("generated_tests", all);
  }

  // ==========================================
  // Notes Store (Ders Notları)
  // ==========================================
  getAllNotes(): DB_StudyNote[] {
    return this.loadList<DB_StudyNote>("study_notes")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getNotesForDocument(documentId: string): DB_StudyNote[] {
    return this.getAllNotes().filter(n => n.document_id === documentId);
  }

  getNotesForSubject(subjectId: string): DB_StudyNote[] {
    return this.getAllNotes().filter(n => n.subject_id === subjectId);
  }

  addNote(note: DB_StudyNote): void {
    const all = this.getAllNotes();
    const idx = all.findIndex(n => n.id === note.id);
    if (idx >= 0) all[idx] = note;
    else all.push(note);
    this.saveList("study_notes", all);
  }

  deleteNote(id: string): void {
    this.saveList("study_notes", this.getAllNotes().filter(n => n.id !== id));
  }

  // ==========================================
  // Gemini Coach History Store (Gemini Analysis)
  // ==========================================
  getGeminiAnalysisLogs(): any[] {
    return this.loadList<any>("gemini_analysis_logs")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addGeminiAnalysisLog(analysis: { id: string; analysis_type: string; input_summary: string; output_text: string; model_used: string; created_at: string }): void {
    const all = this.getGeminiAnalysisLogs();
    all.push(analysis);
    this.saveList("gemini_analysis_logs", all);
  }

  // ==========================================
  // API Logs & Utility Cost Tracking
  // ==========================================
  getApiLogs(): DB_ApiUsageLog[] {
    return this.loadList<DB_ApiUsageLog>("api_usage_logs")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addApiUsageLog(log: DB_ApiUsageLog): void {
    const all = this.getApiLogs();
    all.push(log);
    this.saveList("api_usage_logs", all);
  }

  getLogsSummary(): { count: number; totalTokens: number; estimatedCost: number } {
    const logs = this.getApiLogs();
    const today = new Date().toISOString().split("T")[0];
    
    // Filter for today
    const todayLogs = logs.filter(l => l.created_at.startsWith(today));

    let totalTokens = 0;
    let estimatedCost = 0;

    todayLogs.forEach(l => {
      totalTokens += (l.estimated_input_tokens + l.estimated_output_tokens);
      estimatedCost += l.estimated_cost;
    });

    return {
      count: todayLogs.length,
      totalTokens,
      estimatedCost
    };
  }

  // ==========================================
  // Global Study Statistics
  // ==========================================
  getStudyStats(id = "global"): DB_UserStudyStats {
    const list = this.loadList<DB_UserStudyStats>("user_study_stats");
    let stats = list.find(s => s.id === id);
    if (!stats) {
      stats = {
        id,
        cumulative_study_time: 0,
        total_questions_answered: 0,
        total_tests_completed: 0,
        average_score: 0,
        last_activity_at: ""
      };
      
      const tests = id === "global" 
        ? this.getAllTests().filter(t => t.score !== undefined) 
        : this.getTestsForDocument(id).filter(t => t.score !== undefined);
        
      if (tests.length > 0) {
        let totalScore = 0;
        let totalQuestions = 0;
        let totalTime = 0;
        tests.forEach(t => {
          totalScore += t.score || 0;
          totalQuestions += t.question_count || 0;
          totalTime += t.time_taken || 0;
        });
        
        stats.cumulative_study_time = totalTime;
        stats.total_questions_answered = totalQuestions;
        stats.total_tests_completed = tests.length;
        stats.average_score = Math.round(totalScore / tests.length);
        stats.last_activity_at = tests[0].created_at || new Date().toISOString();
      }
      
      list.push(stats);
      this.saveList("user_study_stats", list);
    }
    return stats;
  }

  saveStudyStats(stats: DB_UserStudyStats): void {
    const list = this.loadList<DB_UserStudyStats>("user_study_stats");
    const idx = list.findIndex(s => s.id === stats.id);
    if (idx >= 0) {
      list[idx] = stats;
    } else {
      list.push(stats);
    }
    this.saveList("user_study_stats", list);
  }

  updateStudyStats(id: string, timeSec: number, questionsCount: number, score: number): DB_UserStudyStats {
    const stats = this.getStudyStats(id);
    stats.cumulative_study_time += timeSec;
    
    const prevTestsCount = stats.total_tests_completed;
    const prevAverage = stats.average_score;
    
    stats.total_tests_completed += 1;
    stats.total_questions_answered += questionsCount;
    stats.average_score = Math.round(((prevAverage * prevTestsCount) + score) / stats.total_tests_completed);
    stats.last_activity_at = new Date().toISOString();
    
    this.saveStudyStats(stats);
    
    if (id !== "global") {
      this.updateStudyStats("global", timeSec, questionsCount, score);
    }
    
    return stats;
  }

  addManualStudyTime(id: string, timeSec: number): DB_UserStudyStats {
    const stats = this.getStudyStats(id);
    stats.cumulative_study_time += timeSec;
    stats.last_activity_at = new Date().toISOString();
    this.saveStudyStats(stats);
    
    if (id !== "global") {
      this.addManualStudyTime("global", timeSec);
    }
    
    return stats;
  }

  // ==========================================
  // Custom Flashcard Decks & Cards
  // ==========================================
  getFlashcardDecks(): any[] {
    const decks = this.loadList<any>("flashcard_decks");
    if (decks.length === 0) {
      // Seed default offline study decks if none exist so the app starts fully populated!
      const defaultDecks = [
        {
          id: "deck_mat_basics",
          name: "Temel Matematik Kuralları & Hatalar",
          subject_id: "sub_mat",
          created_at: new Date().toISOString(),
          cardsCount: 3
        },
        {
          id: "deck_cog_tr",
          name: "YKS Coğrafya Kritikleri",
          subject_id: "sub_cog",
          created_at: new Date().toISOString(),
          cardsCount: 3
        }
      ];
      this.saveList("flashcard_decks", defaultDecks);

      // Seed default cards for these decks
      const defaultMatCards: Flashcard[] = [
        {
          id: "card_mat_1",
          term: "Bir sayının sıfırıncı kuvveti daima 1 midir?",
          definition: "Hayır. Sıfır hariç her sayının 0. kuvveti 1'dir. 0⁰ (sıfır üzeri sıfır) belirsizdir. ||| Tebrikler! Matematikteki en kritik istisnalardan birini doğru hatırladın. ||| Yanıldın! Nerede Hata Yaptın: 'Her sayının sıfırıncı kuvveti 1'dir' genellemesine takıldın. Ne yapmalısın: 0⁰ ifadesinin belirsiz kalacağını unutma. Nasıl çözersin: x≠0 durumunda x⁰=1 kuralını uygula, taban 0 ise işlem tanımsız/belirsiz kalır!"
        },
        {
          id: "card_mat_2",
          term: "Limit varlığı için sağdan ve soldan limitler birbirine eşit olmalıdır, ancak o noktada tanımlı olma zorunluluğu var mıdır?",
          definition: "Hayır. Limit varlığı için o noktada tanımlı olma zorunluluğu yoktur. ||| Muhteşem! Grafiklerdeki içi boş deliklerde bile limitin var olduğunu çok iyi hatırladın. ||| Yanlış! Nerede Hata Yaptın: Limit kavramı ile süreklilik kavramını karıştırdın. Ne yapmalısın: Bir fonksiyonun x=a noktasında limitinin olması için sadece sağdan ve soldan limitlerin eşit olması kafidir. Nasıl çözersin: f(a) değerinin ne olduğunu önemsemeden, sağdan ve soldan yaklaştığın değerlerin aynı olup olmadığı grafiğine bak!"
        },
        {
          id: "card_mat_3",
          term: "Türevlenebilir her fonksiyon o noktada sürekli midir?",
          definition: "Evet. Bir fonksiyon bir noktada türevli ise o noktada kesinlikle süreklidir. Tersine her sürekli fonksiyon türevli olmak zorunda değildir (Örn: Sivri uçlar). ||| Doğru! 'Türev varsa süreklilik şarttır' ilişkisini çok iyi kurmuşsun. ||| Yanıldın! Nerede Hata Yaptın: Süreklilik ile türev ilişkisinin hiyerarşisini karıştırdın. Ne yapmalısın: Süreklilik bir ön şarttır. Sürekli olmayan yerde türev olamaz. Nasıl çözersin: Önce sürekliliğe bak, sürekliyse ve sivri uç yoksa türevlenebilir diyebilirsin."
        }
      ];
      const defaultCogCards: Flashcard[] = [
        {
          id: "card_cog_1",
          term: "Ege Bölgesi'nde dağlar denize dik uzandığı için kıyı ile iç kesimler arasında iklim farklılığı çok yüksek midir?",
          definition: "Hayır. Dağlar denize dik uzandığından denizel iklim iç kesimlere kolayca girebilir, dolayısıyla iklim farkı görece azdır. ||| Harika! Akdeniz ve Karadeniz ile olan bu dik-paralel farkını çok iyi bildin. ||| Yanılgı! Nerede Hata Yaptın: Karadeniz ve Akdeniz'deki 'paralel' uzanışı kuralıyla karıştırdın. Ne yapmalısın: Ege'de dağların aralarından nemli havanın içeri sokulduğunu hayal et. Nasıl çözersin: Ege'de kıyı ile 100 km içerisi arasında hemen hemen aynı zeytin tarımı ve sıcaklığı görebileceğini unutma."
        },
        {
          id: "card_cog_2",
          term: "Türkiye'de kanyon vadiler en çok karstik arazi yapısına sahip Akdeniz Bölgesi'nde mi görülür?",
          definition: "Evet. Kanyon vadiler, dirençli karstik tabakaların aşınmasıyla derinleşerek oluşur ve yaygın olarak Toroslar kuşağında yer alır. ||| Doğru! Karstik kayaç tiplerinin kanyon oluşumundaki rolünü harika bildin. ||| Yanıldın! Nerede Hata Yaptın: Volkanik tüfler veya akarsu birikim havzalarıyla karıştırdınız. Nasıl çözersin: Karstik kireçtaşlarının dik duvarlı vadiler oluşturmaya elverişli yapısı ve çözünebilirliğini ezberine kaydet."
        }
      ];

      this.saveList("flashcards_deck_deck_mat_basics", defaultMatCards);
      this.saveList("flashcards_deck_deck_cog_tr", defaultCogCards);

      return defaultDecks;
    }
    return decks;
  }

  saveFlashcardDecks(decks: any[]): void {
    this.saveList("flashcard_decks", decks);
  }

  getFlashcardsForDeck(deckId: string): Flashcard[] {
    return this.loadList<Flashcard>(`flashcards_deck_${deckId}`);
  }

  saveFlashcardsForDeck(deckId: string, cards: Flashcard[]): void {
    this.saveList(`flashcards_deck_${deckId}`, cards);
    // Sync size on deck itself
    const decks = this.getFlashcardDecks();
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      deck.cardsCount = cards.length;
      this.saveFlashcardDecks(decks);
    }
  }

  deleteFlashcardDeck(deckId: string): void {
    this.saveList("flashcard_decks", this.getFlashcardDecks().filter(d => d.id !== deckId));
    localStorage.removeItem(this.getStorageKey(`flashcards_deck_${deckId}`));
  }

  getMistakes(): DB_Mistake[] {
    const list = this.loadList<DB_Mistake>("yks_mistakes");
    if (list.length === 0) {
      const defaultMistakes: DB_Mistake[] = [
        {
          id: "mistake_1",
          subject_id: "sub_mat",
          topic_id: "top_mat_1",
          question_text: "Bir f f fonksiyonunun x -> a limitinin varlığı için o noktada f(a) değerinin tanımlı olması şart mıdır?",
          user_answer: "Evet, fonksiyonun o noktada tanımlı olması zorunludur yoksa limiti olamaz.",
          correct_answer: "Hayır. Limit kavramı x noktasının o değere 'yaklaşırkenki' davranışını inceler, tam o noktadaki değerle veya tanımlılıkla ilgilenmez.",
          mistake_type: "knowledge_gap",
          analysis_text: "Fonksiyonun limitinin olması için sürekli olması gerektiği ya da tanımlı olması gerektiği yanılgısına kapıldın. Limit için tek kural sağdan ve soldan yaklaşımların eşit olmasıdır.",
          solution_strategy: "Kritik kural: Noktada 'delik' (tanımsızlık) olsa bile sağ ve sol limitler birbirine eşit olduğu sürece o noktada limit vardır. Tanımlı olması kuralı 'Limit' için değil 'Süreklilik' için şarttır!",
          is_resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "mistake_2",
          subject_id: "sub_tur",
          topic_id: "top_tur_1",
          question_text: "Yandaki paragrafta yazarın edebiyat ve insan ilişkisine dair aşağıdakilerden hangisi 'savunulamaz' şeklindeki olumsuz soru kökünü doğru okuma.",
          user_answer: "Direkt savunulabilen ilk şıkkı görüp işaretledim.",
          correct_answer: "Paragraftaki olumsuz 'savunulamaz' veya 'değinilmemiştir' kelimesine dikkat ederek şıkları elemek gerekiyordu.",
          mistake_type: "misreading",
          analysis_text: "Sınav stresinde ve heyecanda olumsuz soru kökünün altı çizili olmasına rağmen 'savunulabilir' gibi okuyup doğru olan ilk seçeneğe atladın. Bu klasik bir dikkat sarsıntısıdır.",
          solution_strategy: "Olumsuz soru köklerini yuvarlak içine al, eleyerek tek tek yanlarına eksi (-) veya artı (+) koyarak ilerle. Beş şıkkın dördü paragrafta var, bir tanesi yoktur.",
          is_resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      this.saveList("yks_mistakes", defaultMistakes);
      return defaultMistakes;
    }
    return list;
  }

  saveMistakes(list: DB_Mistake[]): void {
    this.saveList("yks_mistakes", list);
  }

  addMistake(mistake: DB_Mistake): void {
    const list = this.getMistakes();
    this.saveList("yks_mistakes", [mistake, ...list]);
  }

  updateMistake(updated: DB_Mistake): void {
    const list = this.getMistakes();
    this.saveList("yks_mistakes", list.map(m => m.id === updated.id ? updated : m));
  }

  deleteMistake(id: string): void {
    const list = this.getMistakes();
    this.saveList("yks_mistakes", list.filter(m => m.id !== id));
  }
}

export const db = new DatabaseService();
export default db;
