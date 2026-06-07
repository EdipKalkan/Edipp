import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Helper to initialize GoogleGenAI client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// REST Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 1. General prompt proxy (Summary, student explanation, exam mode)
app.post("/api/gemini/prompt", async (req, res) => {
  try {
    const { text, promptType, customApiKey, customPrompt, explanationMode } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "PDF içeriği boş olamaz veya çıkartılamadı." });
    }

    let ai;
    try {
      ai = getGeminiClient(customApiKey);
    } catch (e: any) {
      return res.status(401).json({ error: "Gemini API anahtarı yapılandırılmamış veya geçersiz. Lütfen Ayarlar sayfasından geçerli bir API anahtarı kaydedin veya sistem yöneticinize başvurun." });
    }

    let systemInstruction = "Sen profesyonel bir eğitim asistanısın. Matematiksel işlemleri, sembolleri (integral, limit, türev, fonksiyonlar, 3x ve denklemler vb.) açıklarken mutlaka formülleri '$$ ... $$' veya tekli sembolleri '$ ... $' işaretleri arasına yerleştirmelisin. Herhangi bir sayısal veri, kıyaslama veya istatistik açıklarken ise kesinlikle markdown tablo formatı (| Başlık 1 | Başlık 2 |) kullanmalısın.";
    let finalPrompt = "";

    // Apply specific prompt style based on action
    if (promptType === "summary") {
      systemInstruction = "Sen profesyonel bir eğitim asistanısın. Kullanıcının yüklediği PDF içeriğini analiz et. PDF dışında kesin bilgi uydurma. Matematiksel ifadeleri (integral, türev, limit, fonksiyon gibi sembolleri) '$$ ... $$' veya '$ ... $' içine al. Sayısal/karşılaştırmalı verileri mutlaka detaylı markdown tabloları (| Sütun 1 | Sütun 2 |) ile açıkla.";
      finalPrompt = `Aşağıdaki PDF içeriğini analiz et ve şu Türkçe başlıklar altında detaylıca ve şık bir şekilde formatlayarak özetle:
1. **Belgenin Genel Konusu**: Konunun ne olduğunu net bir şekilde tanımla.
2. **Ana Başlıklar ve Açıklamalar**: Belgedeki ana başlıkları çıkar ve her birini anlaşılır şekilde açıkla.
3. **Bilinmesi Gereken Önemli Bilgiler**: Konunun temel formülleri, kuralları, kavramları veya kritik detayları (Bunları mutlaka '$$' matematiksel formül blokları veya '$' inline kodlarla simgeleştir).
4. **Sınavda Çıkabilecek Noktalar**: Sınavda sorulması en muhtemel kısımlar.
5. **Karıştırılan Kavramlar**: Öğrencilerin sıkça karıştırdığı terimler ve farkları. Sayısal kıyaslamaları markdown tabloları ile detaylandır.
6. **Kısa Tekrar Notu**: Hafızada kalıcı, hızlı bir hafıza kartı özeti.

PDF İçeriği:
${text}`;
    } else if (promptType === "student") {
      systemInstruction = "Sen sevecen, cana yakın bir öğretmensin. Konuları karmaşık akademik dilden uzaklaştırıp, günlük hayat örnekleriyle ve eğlenceli bir öğrenci jargonuna uygun, son derece basit, anlatırsın. Matematiksel formülleri (integral, limit, türev gibi), denklemleri (3x, x^2 vb.) ve fonksiyonları mutlaka '$$ ... $$' veya '$ ... $' içine alarak görsel kart formatında tetikle. Sayısal verileri markdown tabloları ile özetle.";
      finalPrompt = `Aşağıdaki eğitim içeriğini bir öğrencinin kolayca anlayabileceği şekilde açıkla. 
- Günlük hayattan örnekler ve eğlenceli analojiler kullan.
- Matematiksel sembolleri (integral, limit, türev, fonksiyon) kesinlikle '$$ ... $$' blokları ile simgelendir (Böylece sistemimiz onları büyük görsel sembol kartları halinde çizecek).
- Sayısal veriler ve formül karşılaştırmalarını mutlaka markdown tabloları (| Terim | Anlamı | Örnek |) formatında göster.
- Gereksiz akademik dilden tamamen kaçın.
- Önce konunun ana mantığını basitçe anlat.
- Sonuna "Öğrenci Akıl Defteri" adında kısa ve pratik notlar ekle.

İçerik:
${text}`;
    } else if (promptType === "exam") {
      systemInstruction = "Sen sınav hazırlık koçu ve uzman bir eğitmensin. Soru tahminleri yapmakta ustasın. Matematiksel formülleri '$$ ... $$' içine al, sayısal verileri tablolala.";
      finalPrompt = `Aşağıdaki PDF içeriğini sınav odaklı analiz et:
- En çok çıkabilecek noktaları listele.
- Kesinlikle ezberlenmesi ve bilinmesi gereken kritik bilgileri vurgula.
- Matematiksel denklemleri ve temel teoremleri (integral, limit, türev, fonksiyonlar) '$$ ... $$' formatı ile belirt.
- Sayısal formülleri ve soru kalıplarını karşılaştırmalı markdown tabloları ile göster.
- İçeriğe göre 3 adet tahmini mini "Sınav Sorusu" ve altına kısa cevaplarını yaz.

İçerik:
${text}`;
    } else if (promptType === "chat") {
      systemInstruction = "Sen Sokrates PDF Asistanı'sın. Kullanıcıya yüklediği PDF bağlamına göre yardımcı olursun. PDF dışına çıkma, bilgi uydurma. Matematiksel işlemleri '$$ ... $$' veya '$ ... $' ile belirt, sayısal verileri hep markdown tabloları halinde sun.";
      finalPrompt = `Aşağıdaki PDF içeriği bağlamında kullanıcının sorusunu yanıtla. Matematiksel işlemleri (integral, limit, türev, 3x denklemleri gibi) mutlaka '$$ ... $$' içinde belirt. Tablosal sayısal veriler kullan.
      
PDF İçeriği:
${text}

Kullanıcının Sorusu:
${customPrompt}`;
    } else if (promptType === "solve") {
      systemInstruction = "Sen her aşamayı adım adım açıklayan profesyonel bir öğretmensin. Formülleri mutlaka '$$ ... $$' veya '$ ... $' içine alırsın. Sayısal verileri tablosal şekilde açıklarsın.";
      finalPrompt = `Aşağıdaki PDF içeriği bağlamında şu soruyu/konuyu detaylı olarak çöz ve açıkla:
Soruyu çözerken:
1. Doğru cevabı direkt söyleme, adım adım mantığını ve matematiksel formülünü ('$$ ... $$' içinde) göster.
2. İntegral, limit, türev veya fonksiyon sembollerini büyük görsel tetikleyici olsun diye '$$' formülleri ile belirt.
3. Sayısal değerleri ve adım adım ara işlemleri şık bir karşılaştırma tablosu ile sun.
4. Gerekirse şıkları elerken neden elendiğini ayrı ayrı açıkla.
5. Öğrencinin bu soruda nereye takılabileceğini, yapılan en yaygın hataları ve ipuçlarını belirt.

Kullanıcının Çözülmesini İstediği Soru:
${customPrompt}

PDF Bağlamı:
${text}`;
    } else if (promptType === "flashcards") {
      systemInstruction = "Sen terimleri ve kısa, anlaşılır tanımları çıkaran akademik bir asistan kılavuzusun. Kullanıcıya yüklediği PDF bağlamındaki en önemli terimleri içeren bir JSON dizisi döneceksin. Tanımlar kısa, öz ve akılda kalıcı olmalıdır.";
      finalPrompt = `Aşağıdaki eğitim içeriğinde yer alan en önemli anahtar terimleri, formülleri ya da kavramları belirle ve bunlardan 6 ila 12 adet arası interaktif hafıza kartı (flashcard) üret. 
Her kart için bir terim (term) ve bunun kısa, akılda kalıcı tanımını/açıklamasını (definition) yaz.

İçerik:
${text}`;
    } else {
      // Freeform or customizable
      finalPrompt = customPrompt || "Lütfen bu içeriği analiz et.";
    }

    // Apply explanation mode modifying instruction if provided
    if (explanationMode === "student") {
      systemInstruction += " Yanıtlarını tamamen samimi, yalın ve örneklerle dolu öğrenci dili ile oluştur.";
    } else if (explanationMode === "simple") {
      systemInstruction += " Yanıtlarını 10 yaşındaki bir çocuğun bile anlayabileceği derecede basit, kısa cümlelerle oluştur.";
    }

    const selectedModel = req.body.model || "gemini-2.5-flash-lite";

    const isJsonMode = promptType === "flashcards";
    const config: any = {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    };

    if (isJsonMode) {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          flashcards: {
            type: Type.ARRAY,
            description: "Oluşturulan interaktif hafıza kartları listesi",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                term: { type: Type.STRING, description: "Hafıza kartının ön yüzündeki terim veya konsept" },
                definition: { type: Type.STRING, description: "Hafıza kartının arka yüzündeki kısa, net tanım veya kural" }
              },
              required: ["id", "term", "definition"]
            }
          }
        },
        required: ["flashcards"]
      };
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: finalPrompt,
      config: config
    });

    res.json({ output: response.text });
  } catch (error: any) {
    console.error("Prompt API Error:", error);
    res.status(500).json({ error: error.message || "Yapay zeka yanıtı üretilirken bir hata oluştu." });
  }
});

// 2. Generate specialized interactive Test Schema JSON
app.post("/api/gemini/generate-test", async (req, res) => {
  try {
    const { text, customApiKey, count = 5, difficulty = "orta", explanationMode } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "PDF içeriği bulunamadı." });
    }

    let ai;
    try {
      ai = getGeminiClient(customApiKey);
    } catch (e: any) {
      return res.status(401).json({ error: "Gemini API anahtarı yapılandırılmamış veya geçersiz." });
    }

    const systemInstruction = `Sen profesyonel bir ölçme ve değerlendirme uzmanısın. PDF içeriğine sadık kalarak seçilen zorluk seviyesinde (${difficulty}) tam olarak ${count} adet çoktan seçmeli test sorusu üreteceksin. Sorular sadece PDF içeriğindeki bilgilere dayanmalıdır, dışarıdan hayali bilgi ekleme. Verilen JSON şemasına harfiyen uy.`;

    const prompt = `Aşağıdaki PDF içeriğine dayanarak zorluk seviyesi "${difficulty}" olan ${count} adet çoktan seçmeli soru içeren bir test üret. 
Her soru için tam 4 şık (A, B, C, D) olmalı, şıklar seçenekler dizisinde (options) düzgünce belirtilmelidir.
Doğru seçenek (correctAnswer) sadece tek bir harf olmalı: "A", "B", "C" veya "D".
Soru çözümü/açıklaması (explanation) anlaşılır biçimde açıklanmalıdır.

PDF İçeriği:
${text}`;

    const selectedModel = req.body.model || "gemini-2.5-flash-lite";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "Oluşturulan çoktan seçmeli sorular dizisi",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER, description: "Soru numarası (1'den başlayarak)" },
                  question: { type: Type.STRING, description: "Sorunun kendisi" },
                  options: {
                    type: Type.ARRAY,
                    description: "Seçenekler dizisi (Örn: ['A) ...', 'B) ...', 'C) ...', 'D) ...'])",
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING, description: "Doğru şık harfi: sadece 'A', 'B', 'C' veya 'D'" },
                  explanation: { type: Type.STRING, description: "Sorunun mantıklı çözümü ve açıklaması" }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);
  } catch (error: any) {
    console.error("Test Generation API Error:", error);
    res.status(500).json({ error: error.message || "Test soruları paketlenirken hata oluştu." });
  }
});

// 3. Generate custom student academic Quiz questions based on lesson, topic, difficulty and query count
app.post("/api/quiz/generate", async (req, res) => {
  try {
    const { lesson, topic, count = 10, difficulty = "orta", type = "KPSS tarzı", customApiKey, model = "gemini-3.5-flash" } = req.body;

    if (!lesson || !topic || topic.trim() === "") {
      return res.status(400).json({ error: "Lütfen soru üretilmek istenen dersi ve konuyu eksiksiz belirtin." });
    }

    let ai;
    try {
      ai = getGeminiClient(customApiKey);
    } catch (e: any) {
      return res.status(401).json({ error: "Gemini API anahtarı yapılandırılmamış veya geçersiz. Lütfen Ayarlar sayfasından geçerli bir API anahtarı kaydedin veya sistem yöneticinize başvurun." });
    }

    const systemInstruction = `Sen profesyonel bir ölçme ve değerlendirme uzmanısın. Kullanıcının seçtiği Ders: "${lesson}", Konu: "${topic}", Zorluk Seviyesi: "${difficulty}", Soru Tipi: "${type}" kriterlerine uygun olarak tam ${count} adet çoktan seçmeli, özgün ve yüksek kaliteli test sorusu üreteceksin.
    
    KRİTİK KURALLAR:
    1. TEK KONU MODU AKTİFTİR: Sorular SADECE ve kesinlikle belirtilen konu olan "${topic}" ile ilgili olmalı ve bu konunun dışına ASLA çıkmamalıdır. Sadece bu spesifik kavrama veya alt başlığa ait sorular üretilmelidir. Tanzimat, savaşlar veya alakasız dönem her ne ise, konu dışındakiler tamamen filtrelenmeli, kesinlikle konu dışına çıkılmamalıdır.
    2. Cevaplar net, kesin ve bilimsel açıdan tartışmasız olmalı, her sorunun tam olarak bir doğru şıkkı bulunmalıdır.
    3. Seçenekler (A, B, C, D) dengeli dağıtılmalı, doğru cevap sürekli aynı harfte olmamalıdır.
    4. Seçenek dizisi elemanları temizce "A) ...", "B) ...", "C) ...", "D) ..." formatında olmalıdır.
    5. Açıklamalar kısa, öğretici, akılda kalıcı ve samimi bir öğrenci diliyle kurgulanmalıdır.
    6. Verilen JSON şemasını birebir uygula. JSON yapısı dışında herhangi bir açıklayıcı metin ya da etiket ekleme.`;

    const prompt = `Lütfen dersi "${lesson}" ve konusu "%${topic}" olan, zorluk seviyesi "${difficulty}" ve tarzı "${type}" olan tam ${count} adet çoktan seçmeli test sorusu üret.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "Oluşturulan özgün test soruları dizisi",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER, description: "Soru numarası (1'den başlayarak)" },
                  lesson: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  question: { type: Type.STRING, description: "Sorunun kendisi (okunabilir, büyük fontlar için uygun)" },
                  options: {
                    type: Type.ARRAY,
                    description: "Tam olarak 4 seçenek ('A) ...', 'B) ...', 'C) ...', 'D) ...')",
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING, description: "Doğru şık harfi: sadece 'A', 'B', 'C' veya 'D'" },
                  explanation: { type: Type.STRING, description: "Kısa, öğretici ve akılda kalıcı soru çözüm analizi (Neden doğru ve şıklardaki istisnalar)" },
                  difficulty: { type: Type.STRING }
                },
                required: ["id", "lesson", "topic", "question", "options", "correctAnswer", "explanation", "difficulty"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);
  } catch (error: any) {
    console.error("Custom Quiz Generation API Error:", error);
    res.status(500).json({ error: error.message || "Özel Quiz soruları hazırlanırken sunucu bazlı bir hata oluştu." });
  }
});

// Integrate Vite Middleware or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
