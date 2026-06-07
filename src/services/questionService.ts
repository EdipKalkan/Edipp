import { db, DB_Question } from "./databaseService";
import { gemini } from "./geminiService";

export class QuestionService {
  /**
   * Solve a specific student question or complex mathematical equation step-by-step
   */
  static async askQuestion(
    documentId: string, 
    questionText: string, 
    customApiKey?: string
  ): Promise<string> {
    return await gemini.answerQuestionFromPdf(documentId, questionText, customApiKey);
  }

  /**
   * Detail solve structured problem inside mathematical contexts
   */
  static async solveComplexQuestion(
    documentId: string,
    questionText: string,
    customApiKey?: string
  ): Promise<string> {
    return await gemini.solveComplexQuestion(documentId, questionText, customApiKey);
  }

  /**
   * Get all historic conversations or solver prompts
   */
  static getHistory(documentId: string): DB_Question[] {
    return db.getQuestionsForDocument(documentId);
  }

  /**
   * Generates a topic-specific quiz using Gemini API by formatting the custom prompt 
   * to strictly request JSON output following the application's required question/answer schema,
   * handling potential parse errors gracefully.
   */
  static async generateTopicTest(
    lesson: string,
    topic: string,
    count: number = 10,
    difficulty: string = "Orta",
    type: string = "KPSS tarzı",
    customApiKey?: string
  ): Promise<any[]> {
    if (!lesson || !topic || topic.trim() === "") {
      throw new Error("Lütfen ders ve konu alanlarını eksiksiz doldurun.");
    }

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lesson,
          topic,
          count,
          difficulty,
          type,
          customApiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Sunucu bazlı soru oluşturma hatası oluştu.");
      }

      const responseData = await response.json();
      
      // Verification of array structure
      if (!responseData || !responseData.questions || !Array.isArray(responseData.questions)) {
        throw new Error("Gelen veri yapısı geçersiz. 'questions' dizisi bulunamadı.");
      }

      const validatedQuestions = responseData.questions.map((q: any, index: number) => {
        // Enforce fallback boundaries or format
        return {
          id: typeof q.id === "number" ? q.id : (index + 1),
          lesson: q.lesson || lesson,
          topic: q.topic || topic,
          question: q.question || "Soru içeriği oluşturulamadı.",
          options: Array.isArray(q.options) && q.options.length === 4 
            ? q.options 
            : ["A) Alternatif A", "B) Alternatif B", "C) Alternatif C", "D) Alternatif D"],
          correctAnswer: typeof q.correctAnswer === "string" && ["A", "B", "C", "D"].includes(q.correctAnswer.toUpperCase().trim()) 
            ? q.correctAnswer.toUpperCase().trim() 
            : "A",
          explanation: q.explanation || "Açıklama mevcut değil.",
          difficulty: q.difficulty || difficulty
        };
      });

      return validatedQuestions;
    } catch (error: any) {
      console.error("Yapay zeka soru üretiminde ayrıştırma veya bağlantı hatası:", error);
      throw new Error(error.message || "Yapay zeka soru ayrıştırma hatası. Lütfen tekrar deneyin.");
    }
  }
}
export const questionService = QuestionService;
