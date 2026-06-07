import { db, DB_GeneratedTest } from "./databaseService";
import { gemini } from "./geminiService";

export class TestService {
  /**
   * Generates a new quiz and automatically persists it to database
   */
  static async createTest(
    documentId: string, 
    count: number, 
    difficulty: "kolay" | "orta" | "zor", 
    customApiKey?: string
  ): Promise<any> {
    return await gemini.generateTestFromPdf(documentId, count, difficulty, customApiKey);
  }

  /**
   * Get all tests for document
   */
  static getTests(documentId: string): DB_GeneratedTest[] {
    return db.getTestsForDocument(documentId);
  }

  /**
   * Save user quiz answer logs and calculate final score
   */
  static submitTestAnswers(
    testId: string, 
    userAnswers: Record<number, string>, 
    score: number,
    timeTaken?: number
  ): void {
    const list = db.getDocuments(); // dummy read to get references
    // Fetch tests globally or use db direct
    const tests = db.getTestsForDocument(""); // gets loaded internally
    // Let's reach into DB_GeneratedTest
    const settings = db.getSettings();
    
    // In our db store, we can save user answers direct to generated tests
    const all = (db as any).getAllTests() || [];
    const targetTest = all.find((t: any) => t.id === testId);
    if (targetTest) {
      targetTest.user_answers = JSON.stringify(userAnswers);
      targetTest.score = score;
      if (timeTaken !== undefined) {
        targetTest.time_taken = timeTaken;
      }
      db.addTest(targetTest);
    }
  }
}
export const testService = TestService;
