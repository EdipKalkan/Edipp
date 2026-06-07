import { db, DB_DocumentChunk, DB_ApiUsageLog, DB_DocumentSummary, DB_Question, DB_GeneratedTest } from "./databaseService";

class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }
}

export class GeminiService {
  /**
   * Translates the economy setting into the corresponding model and prompt density
   */
  static getModelAndConfig() {
    const settings = db.getSettings();
    const mode = settings.explanation_level; // "Ekonomik" | "Dengeli" | "Kaliteli"
    
    // Default models based on the official gemini-api system skill (gemini-3.1-flash-lite for basic economy, 2.5/3.5 for balanced, 3.1-pro-preview for complex)
    let model: string = "gemini-3.1-flash-lite"; 
    let maxOutputTokens = 850;
    let verboseConstraint = "Kısa, net ve öz notlar ver. Gereksiz tekrardan ve süslemeden kaçın. API maliyet kontrolü amacıyla yanıtı olabildiğince kompakt tut.";

    if (mode === "Dengeli") {
      model = "gemini-2.5-flash"; 
      maxOutputTokens = 1500;
      verboseConstraint = "Yanıtı dengeli ve anlaşılır tut. Ne çok uzun ne çok kısa olsun, konuyu net açıklasın.";
    } else if (mode === "Kaliteli") {
      // Direct high quality from gemini-api rule: gemini-3.1-pro-preview
      model = "gemini-3.1-pro-preview"; 
      maxOutputTokens = 2500;
      verboseConstraint = "Kapsamlı, son derece detaylı ve derinlemesine açıklamalar yap. Bilimsel/akademik ve sınavda çıkabilecek tüm kritik yerleri kapsasın.";
    }

    // Force override if custom model is selected in settings
    if (settings.selected_model) {
      model = settings.selected_model;
    }

    return { model, maxOutputTokens, verboseConstraint };
  }

  /**
   * Helper saving and retrieving keys (encapsulated)
   */
  static saveApiKey(key: string): void {
    const settings = db.getSettings();
    settings.gemini_api_key = key;
    db.saveSettings(settings);
  }

  static getApiKey(): string {
    return db.getSettings().gemini_api_key || "";
  }

  /**
   * Log API usage & estimate cost
   */
  static logUsage(operationType: string, inputChars: number, outputChars: number, model: string): void {
    const inputTokens = Math.ceil(inputChars / 4);
    const outputTokens = Math.ceil(outputChars / 4);

    let inputRate = 0.075; // USD / 1M
    let outputRate = 0.30; // USD / 1M

    if (model.includes("pro")) {
      inputRate = 1.25;
      outputRate = 5.00;
    } else if (model.includes("flash") && !model.includes("lite")) {
      inputRate = 0.075;
      outputRate = 0.30;
    } else if (model.includes("lite")) {
      inputRate = 0.075;
      outputRate = 0.30;
    }

    const estimatedCost = ((inputTokens * inputRate) + (outputTokens * outputRate)) / 1000000;

    const log: DB_ApiUsageLog = {
      id: "log_" + Math.random().toString(36).substring(2, 11),
      operation_type: operationType,
      model_used: model,
      estimated_input_tokens: inputTokens,
      estimated_output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      created_at: new Date().toISOString()
    };

    db.addApiUsageLog(log);
  }

  /**
   * Context selector: selects only relevant PDF chunks based on query overlap
   */
  static selectRelevantChunks(chunks: DB_DocumentChunk[], query: string, maxChars = 8000): string {
    const lowercaseQuery = query.toLowerCase();
    const searchTerms = lowercaseQuery
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'[]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 2);

    if (searchTerms.length === 0 || chunks.length <= 2) {
      return chunks.map(c => c.chunk_text).join("\n\n").slice(0, maxChars);
    }

    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const text = chunk.chunk_text.toLowerCase();
      
      searchTerms.forEach(term => {
        if (text.includes(term)) {
          score += 5;
          const occurrences = text.split(term).length - 1;
          score += occurrences;
        }
        if (chunk.keywords.some(k => k.includes(term) || term.includes(k))) {
          score += 15;
        }
      });
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const selected = scoredChunks.filter(sc => sc.score > 0).slice(0, 3).map(sc => sc.chunk);
    
    if (selected.length === 0) {
      return chunks.slice(0, 3).map(c => c.chunk_text).join("\n\n");
    }

    return selected
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map(c => `[Sayfa ${c.page_start}-${c.page_end} Arası Bilgiler]:\n${c.chunk_text}`)
      .join("\n\n");
  }

  /**
   * Summarize Document Method with caching check
   */
  static async summarizeDocument(documentId: string, customApiKey?: string): Promise<string> {
    const cached = db.getSummary(documentId, "professional");
    if (cached) return cached.summary_text;

    const { model, verboseConstraint } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    
    const contextText = chunks.length > 6 
      ? chunks.slice(0, 3).map(c => c.chunk_text).join("\n") + "\n...[ARA BÖLÜM PARÇALARI KESİLDİ - MALİYET KONTROLÜ]...\n" + chunks.slice(-2).map(c => c.chunk_text).join("\n")
      : chunks.map(c => c.chunk_text).join("\n");

    const responseText = await this.callProxyAPI("summary", contextText, model, verboseConstraint, "", customApiKey);

    const summary: DB_DocumentSummary = {
      id: `${documentId}_professional`,
      document_id: documentId,
      summary_type: "professional",
      model_used: model,
      summary_text: responseText,
      created_at: new Date().toISOString()
    };
    db.addSummary(summary);
    return responseText;
  }

  /**
   * Explain Like a Student Method
   */
  static async explainLikeStudent(documentId: string, customApiKey?: string): Promise<string> {
    const cached = db.getSummary(documentId, "student");
    if (cached) return cached.summary_text;

    const { model, verboseConstraint } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    const contextText = chunks.slice(0, 4).map(c => c.chunk_text).join("\n");

    const responseText = await this.callProxyAPI("student", contextText, model, verboseConstraint, "", customApiKey);

    const summary: DB_DocumentSummary = {
      id: `${documentId}_student`,
      document_id: documentId,
      summary_type: "student",
      model_used: model,
      summary_text: responseText,
      created_at: new Date().toISOString()
    };
    db.addSummary(summary);
    return responseText;
  }

  /**
   * Exam Target Analysis Method
   */
  static async examAnalysis(documentId: string, customApiKey?: string): Promise<string> {
    const cached = db.getSummary(documentId, "exam");
    if (cached) return cached.summary_text;

    const { model, verboseConstraint } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    const contextText = chunks.slice(0, 4).map(c => c.chunk_text).join("\n");

    const responseText = await this.callProxyAPI("exam", contextText, model, verboseConstraint, "", customApiKey);

    const summary: DB_DocumentSummary = {
      id: `${documentId}_exam`,
      document_id: documentId,
      summary_type: "exam",
      model_used: model,
      summary_text: responseText,
      created_at: new Date().toISOString()
    };
    db.addSummary(summary);
    return responseText;
  }

  /**
   * Solve PDF Problem with Custom Input
   */
  static async solveComplexQuestion(documentId: string, question: string, customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    const contextText = this.selectRelevantChunks(chunks, question);

    const responseText = await this.callProxyAPI("solve", contextText, model, verboseConstraint, question, customApiKey);

    const dbQuestion: DB_Question = {
      id: "q_" + Math.random().toString(36).substring(2, 11),
      document_id: documentId,
      question_text: question,
      answer_text: responseText,
      source_pages: "Hassas Chunk Bağlamı",
      model_used: model,
      created_at: new Date().toISOString()
    };
    db.addQuestion(dbQuestion);
    return responseText;
  }

  /**
   * Chat Query
   */
  static async answerQuestionFromPdf(documentId: string, userQuery: string, customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    const contextText = this.selectRelevantChunks(chunks, userQuery);

    const responseText = await this.callProxyAPI("chat", contextText, model, verboseConstraint, userQuery, customApiKey);

    const dbQuestion: DB_Question = {
      id: "q_chat_" + Math.random().toString(36).substring(2, 11),
      document_id: documentId,
      question_text: userQuery,
      answer_text: responseText,
      source_pages: "Eşleşen Parça Bağlamı",
      model_used: model,
      created_at: new Date().toISOString()
    };
    db.addQuestion(dbQuestion);
    return responseText;
  }

  /**
   * PDF Flashcards Exporter
   */
  static async extractFlashcards(documentId: string, customApiKey?: string): Promise<any[]> {
    const cached = db.getSummary(documentId, "flashcards");
    if (cached) {
      try {
        const parsed = JSON.parse(cached.summary_text);
        if (parsed.flashcards) return parsed.flashcards;
      } catch (e) {}
    }

    const { model } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    const contextText = chunks.slice(0, 4).map(c => c.chunk_text).join("\n");

    const customPromptInstruction = `Kullanıcıya özel YKS sınav düzeyinde interaktif soru kartları çıkaracaksın. 
Her kart için:
1. 'term' alanına: Kıymetli bir sınav sorusu, önerme veya konsept sorusu yaz (Örn: "Karstik arazilerde en büyük aşınım şekli obruk mudur?").
2. 'definition' alanında ise mutlaka şu 3 parçayı tam olarak aralarında " ||| " (boşluklu üçlü dik çizgi) karakteriyle bölerek tek bir metin halinde yaz:
   - Birinci parça: Kısa doğru yanıt veya kuralın aslı (Örn: "Evet, karstik aşınım şekillerinin en derin/büyüğü obruklardır.")
   - İkinci parça: Doğru tahmin eden kullanıcı için özel Sokrates tebriki (Örn: "Tebrikler! Karstik erime çukurlarının en devasa ve derin tavan çökmeli tipinin obruk olduğunu çok iyi biliyorsun.")
   - Üçüncü parça: Yanlış tahmin eden kullanıcı için Sokrates konuşma balonu açıklaması (detaylıca nerede neyin yanlış olduğu, asıl kuralın ne olduğu ve nasıl çözülmesi gerektiğini nükteyle anlat) (Örn: "Yanıldın dostum! Nerede hata yaptın: Muhtemelen polye (gölova) ile derinlik/çöküntü farkını karıştırdın. Asıl Olay: Dolin, uvala, polye yatay genişliktedir, obruk ise dikey derin mağara tavanı çökmesidir. Nasıl çözersin: Obrukları tehlikeli dikey kuyu kuyuları olarak hayal et!")

Lütfen 'definition' hücresine sadece bu 3 parçayı " ||| " ile ayırarak yerleştir. Sadece Türkçe dön. Sadece JSON dön.`;

    const responseText = await this.callProxyAPI(
      "flashcards", 
      contextText, 
      model, 
      "Sen terim ve kısa anlamları çıkaran bir eğitim asistanısın. Sadece JSON dön.", 
      customPromptInstruction, 
      customApiKey
    );

    const summary: DB_DocumentSummary = {
      id: `${documentId}_flashcards`,
      document_id: documentId,
      summary_type: "flashcards",
      model_used: model,
      summary_text: responseText,
      created_at: new Date().toISOString()
    };
    db.addSummary(summary);

    try {
      const parsed = JSON.parse(responseText);
      return parsed.flashcards || [];
    } catch (e) {
      console.error("Failed to parse flashcards JSON:", e);
      return [];
    }
  }

  /**
   * PDF Test Generation Schema
   */
  static async generateTestFromPdf(
    documentId: string, 
    count = 5, 
    difficulty: "kolay" | "orta" | "zor" = "orta", 
    customApiKey?: string
  ): Promise<any> {
    const { model } = this.getModelAndConfig();
    const chunks = db.getChunksForDocument(documentId);
    const contextText = chunks.slice(0, 4).map(c => c.chunk_text).join("\n\n");

    const reqBody = {
      text: contextText,
      customApiKey,
      count,
      difficulty,
      model
    };

    const res = await fetch("/api/gemini/generate-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || "Sunucu test üretirken bir problem yaşadı.");
    }

    const testJson = await res.json();
    const responseStr = JSON.stringify(testJson);
    this.logUsage("generate-test", contextText.length, responseStr.length, model);

    const savedTest: DB_GeneratedTest = {
      id: "test_" + Math.random().toString(36).substring(2, 11),
      document_id: documentId,
      difficulty,
      question_count: count,
      test_json: responseStr,
      answer_key: "",
      created_at: new Date().toISOString()
    };
    
    db.addTest(savedTest);
    return { id: savedTest.id, ...testJson };
  }


  // ==========================================
  // New "Yapay Zeka Destekli Öğrenci Asistanı" (Sokrates) Core API's
  // ==========================================

  /**
   * 1. analyzeDailyStudy()
   */
  static async analyzeDailyStudy(customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();
    
    // Aggregate daily stats from local DB (token-efficient summarization)
    const totalTodaySeconds = db.getTodayStudyTimeSeconds();
    const totalTodayMinutes = Math.round(totalTodaySeconds / 60);

    const sessions = db.getStudySessions();
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySessions = sessions.filter(s => s.started_at.startsWith(todayStr));
    const subjects = db.getSubjects();

    const subjectTimes: Record<string, number> = {};
    const topicDetails: string[] = [];
    const notesList: string[] = [];

    todaySessions.forEach(s => {
      subjectTimes[s.subject_id] = (subjectTimes[s.subject_id] || 0) + s.duration_seconds;
      if (s.note) {
        notesList.push(s.note);
      }
      // Try to find topic name
      const topicId = s.topic_id;
      if (topicId) {
        const matchingTopic = db.getTopics().find(t => t.id === topicId);
        if (matchingTopic) {
          topicDetails.push(`${matchingTopic.name}`);
        }
      }
    });

    const subjectBreakdownStr = subjects.map(sub => {
      const sec = subjectTimes[sub.id] || 0;
      if (sec === 0) return null;
      return `${sub.name}: ${Math.round(sec / 60)} dakika`;
    }).filter(Boolean).join(", ");

    const notesSummary = notesList.length > 0 ? notesList.join(" | ") : "Not alınmadı";
    const topicsSummary = topicDetails.length > 0 ? Array.from(new Set(topicDetails)).join(", ") : "Konu belirtilmedi";
    const totalWeeklySeconds = db.getWeeklyStudyTimeSeconds();
    const totalWeeklyMinutes = Math.round(totalWeeklySeconds / 60);

    const customPrompt = `
      Sen profesyonel bir sınav çalışma asistanısın.
      Kullanıcının bugünkü çalışma verileri aşağıdadır.
      Kısa, net ve uygulanabilir analiz yap.
      Gereksiz motivasyon cümleleri kurma.
      Eksik dersleri belirt.
      Şimdi ne çalışması gerektiğini söyle.
      Cevabı Türkçe ver.

      Veriler:
      - Bugünkü toplam çalışma: ${totalTodayMinutes} dakika
      - Derslere göre süreler: ${subjectBreakdownStr || "Bugün henüz kaydedilmiş bir çalışma süresi bulunmuyor."}
      - Konular: ${topicsSummary}
      - Kullanıcı notları: ${notesSummary}
      - Haftalık toplam: ${totalWeeklyMinutes} dakika

      Cevap formatı:
      1. Bugünkü durum
      2. Güçlü taraf
      3. Eksik kalan ders/konu
      4. Şimdi yapılacak çalışma önerisi
      5. Kısa tekrar planı
    `;

    const textPayload = `Sokrates Günlük Analiz Çerçevesi`;
    const responseText = await this.callProxyAPI("coach_daily", textPayload, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());

    // Save in analysis logs for history
    db.addGeminiAnalysisLog({
      id: "anal_" + Math.random().toString(36).substring(2, 9),
      analysis_type: "daily",
      input_summary: `Bugün: ${totalTodayMinutes} dk, Haftalık: ${totalWeeklyMinutes} dk`,
      output_text: responseText,
      model_used: model,
      created_at: new Date().toISOString()
    });

    return responseText;
  }

  /**
   * 2. analyzeWeeklyStudy()
   */
  static async analyzeWeeklyStudy(customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();
    const weeklySummaryList = db.getStudySummaryForAI();
    const weeklySummaryStr = weeklySummaryList.map(s => `${s.subject_name}: ${s.total_minutes} dakika`).join("\n");
    const totalWeeklySeconds = db.getWeeklyStudyTimeSeconds();
    const totalWeeklyMinutes = Math.round(totalWeeklySeconds / 60);

    const customPrompt = `
      Sen profesyonel bir eğitim koçusun. 
      Kullanıcının son 7 gündeki ders çalışma performans dökümü aşağıdadır:
      ${weeklySummaryStr || "Kaydedilmiş haftalık veri bulunmuyor."}
      
      Toplam Haftalık Çalışma Süresi: ${totalWeeklyMinutes} dakika.

      Lütfen kullanıcının haftalık temposunu objektif, rasyonel ve gerçekçi olarak analiz et:
      - Çalışma dağılımı dengeli mi? Hangi branşlar ihmal edilmiş?
      - Sayısal/Sözel dengesi sınav standardına (TYT/AYT) uygun mu?
      - Önümüzdeki hafta için net, nokta atışı bir öneri planı sun.
      Gereksiz motivasyonel edebiyat yapma, uygulanabilir eğitim tüyoları ver.
    `;

    const textPayload = `Sokrates Haftalık Analiz Çerçevesi`;
    const responseText = await this.callProxyAPI("coach_weekly", textPayload, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());

    db.addGeminiAnalysisLog({
      id: "anal_" + Math.random().toString(36).substring(2, 9),
      analysis_type: "weekly",
      input_summary: `Haftalık Dağılım: ${totalWeeklyMinutes} dk`,
      output_text: responseText,
      model_used: model,
      created_at: new Date().toISOString()
    });

    return responseText;
  }

  /**
   * 3. suggestNextStudyPlan()
   */
  static async suggestNextStudyPlan(selectedSubject: string, customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();

    const customPrompt = `
      Kullanıcı şu anda '${selectedSubject}' dersine odaklanmak istiyor.
      Sınav kazanımları (Örn: TYT/AYT müfredatı) çerçevesinde, kullanıcının bu ders için uygulayabileceği nokta atışı bir çalışma planı oluştur.
      Çalışma planı şunları içermelidir:
      - 1. Odaklanılması gereken en kritik 2 konu başlığı
      - 2. Bu konular için verimli süre dağılımı önerisi (Örn: 40 dk konu, 10 dk mola, 50 dk soru çözümü)
      - 3. Akılda tutulması gereken sınav tüyosu
      Kısa, net ve doğrudan anlat. Türkçe yaz.
    `;

    return this.callProxyAPI("coach_plan", selectedSubject, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());
  }

  /**
   * analyzeMistake()
   * Analyzes an incorrect student question Socratically and outputs a cognitive analysis and a concrete strategy.
   */
  static async analyzeMistake(
    subjectName: string,
    questionText: string,
    userAnswer: string,
    correctAnswer: string,
    mistakeType: string,
    customApiKey?: string
  ): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();

    const customPrompt = `
      Sen Sokratik yaklaşıma sahip, deneyimli ve bilge bir ÖSYM YKS/AYT uzmanı ve eğitim koçusun.
      Öğrenci bir soruda yanlış yaptı ve senin analizini istiyor.
      
      Ders: ${subjectName}
      Hatalı Soru: ${questionText}
      Öğrencinin Yanlış Yanıtı: ${userAnswer || "Belirtilmemiş"}
      Doğru Yanıt: ${correctAnswer || "Belirtilmemiş"}
      Hata Türü: ${mistakeType}

      Lütfen öğrenciyi kırmadan, cana yakın ve profesyonel bir üslupla şu iki kısımdan oluşan bir değerlendirme yap:
      
      1. ANALİZ: Öğrencinin nerede yanılgıya düştüğünü, yaptığı hatanın bilişsel sebebini (dikkat dağınıklığı, kavram kargaşası, acele vb.) ve bu tip soruların can alıcı püf noktasını açıkla.
      2. STRATEJİ: Bir sonraki sınavda bu hatayı tekrarlamaması için uygulayacağı somut ve pratik bir kural, zihin kontrol metodu veya formül öner.
      
      Lütfen yanıtı şu şekilde iki bölüme ayır ve aralarına "---" işareti yerleştir:
      [Analiz metnini buraya yaz]
      ---
      [Çözüm stratejisini buraya yaz]
    `;

    const inputData = `${subjectName} | ${questionText} | ${userAnswer}`;
    return this.callProxyAPI("mistake_analysis", inputData, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());
  }

  /**
   * 4. explainWeakTopic()
   */
  static async explainWeakTopic(topicName: string, customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();

    const customPrompt = `
      Sen profesyonel bir branş öğretmenisin. Kullanıcı sana zorlandığı en zayıf bulduğu şu konuyu sordu: '${topicName}'
      Lütfen bu konuyu:
      1. Akıcı, anlaşılır ve en temel mantığıyla açıkla. Daily hayattaki yansımaları üzerinden analoji kur.
      2. Bilinmesi zorunlu en kritik 1 formül/kuralı açıkça belirt ('$$' matematiksel formül blokları kullanarak).
      3. Sınavda bu konuda yapılan en can alıcı hatayı (öğrenci tuzağını) vurgula.
      Tamamen rasyonel, kompakt ve göz yormayan bir arayüz formatı ile sun.
    `;

    return this.callProxyAPI("coach_weak", topicName, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());
  }

  /**
   * 5. generatePracticeQuestions()
   */
  static async generatePracticeQuestions(studyLogExcerpt: string, customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();

    const customPrompt = `
      Kullanıcının en son çalıştığı konsept hakkındaki döküm aşağıdadır:
      '${studyLogExcerpt}'

      Bu konseptle doğrudan bağlantılı, sınav ayarında (TYT/AYT) özgün, çoktan seçmeli 2 adet pratik test sorusu ve hemen altına detaylı, rasyonel çözümlerini hazırla. Sorular net ve doğrudan kazanımlarla ilgili olsun, süre kaybettirecek teorik saptamalardan uzak dursun.
    `;

    return this.callProxyAPI("coach_questions", studyLogExcerpt, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());
  }

  /**
   * 6. summarizeNote()
   */
  static async summarizeNote(noteTitle: string, noteText: string, customApiKey?: string): Promise<string> {
    const { model, verboseConstraint } = this.getModelAndConfig();

    const customPrompt = `
      Başlık: '${noteTitle}'
      Not İçeriği:
      '${noteText}'

      Yukarıdaki ders çalışma notunu analiz et ve rasyonel, sınav odaklı bir şekilde özetle:
      - En önemli 3 anahtar maddeyi çıkar.
      - Varsa formülleri veya denklemleri '$$ ... $$' içine yerleştir.
      - Sınav tüyosuna değin.
      Özeti olabildiğince kompakt ve okunabilir kıl.
    `;

    return this.callProxyAPI("coach_notesummary", noteText, model, verboseConstraint, customPrompt, customApiKey || this.getApiKey());
  }


  // In-memory static LRU cache of capacity 50 to avoid redundant API request costs
  private static apiCache = new LRUCache<string, string>(50);

  /**
   * REST proxy communication interface to backend server.ts
   */
  private static async callProxyAPI(
    promptType: string,
    text: string,
    model: string,
    verboseConstraint: string,
    customPrompt = "",
    customApiKey = ""
  ): Promise<string> {
    const cleanPrompt = verboseConstraint + " " + customPrompt;
    
    // Generate a unique compound cache key combining query, chunk context, model, and instructions
    const cacheKey = `${promptType}:${model}:${text}:${cleanPrompt}`;
    const cachedResponse = this.apiCache.get(cacheKey);
    if (cachedResponse !== undefined) {
      console.log(`[Gemini Cache Hit] Returning cached response for: ${promptType}`);
      return cachedResponse;
    }
    
    const reqBody = {
      text,
      promptType,
      customApiKey,
      customPrompt: cleanPrompt,
      model
    };

    const res = await fetch("/api/gemini/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || "Yapay zeka yanıt oluştururken hata verdi.");
    }

    const data = await res.json();
    const output = data.output || "";

    // Save to the client-side LRU cache to reduce subsequent token billing
    this.apiCache.set(cacheKey, output);

    this.logUsage(promptType, text.length + cleanPrompt.length, output.length, model);

    return output;
  }
}

export const gemini = GeminiService;
export default gemini;
