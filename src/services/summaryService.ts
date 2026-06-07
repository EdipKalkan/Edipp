import { db, DB_DocumentSummary } from "./databaseService";
import { gemini } from "./geminiService";

export class SummaryService {
  /**
   * Retrieves summary by type, automatically triggers live Gemini if cached representation doesn't exist
   */
  static async getSummaryByType(
    documentId: string, 
    type: DB_DocumentSummary["summary_type"], 
    customApiKey?: string
  ): Promise<string> {
    const cached = db.getSummary(documentId, type);
    if (cached) {
      return cached.summary_text;
    }

    switch (type) {
      case "student":
        return await gemini.explainLikeStudent(documentId, customApiKey);
      case "exam":
        return await gemini.examAnalysis(documentId, customApiKey);
      case "professional":
      default:
        return await gemini.summarizeDocument(documentId, customApiKey);
    }
  }

  /**
   * Checks if summary of a particular type is cached
   */
  static isCached(documentId: string, type: DB_DocumentSummary["summary_type"]): boolean {
    return !!db.getSummary(documentId, type);
  }
}
export const summaryService = SummaryService;
