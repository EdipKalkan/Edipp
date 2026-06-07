import { extractTextFromPDF } from "../utils/pdfExtractor";
import { DB_Document, DB_DocumentPage, DB_DocumentChunk, db } from "./databaseService";

// Simple local Turkish stop words list to extract meaningful keywords locally without API calls
const STOP_WORDS = new Set([
  "ve", "veya", "ile", "bir", "bu", "şu", "o", "da", "de", "için", "gibi", "kadar", "olan", "olarak",
  "ise", "en", "daha", "ama", "fakat", "lakin", "ancak", "ise", "altı", "biri", "beni", "bence", "neden",
  "nasıl", "kim", "nerede", "her", "hep", "hiç", "çünkü", "dolayı", "ötürü", "tarafından", "yani", "yani"
]);

export interface PDFAnalysisResult {
  doc: DB_Document;
  pages: DB_DocumentPage[];
  chunks: DB_DocumentChunk[];
}

export class PdfService {
  private static async isRealPdf(file: File): Promise<boolean> {
    try {
      const blob = file.slice(0, 4);
      const arrayBuffer = await blob.arrayBuffer();
      if (arrayBuffer.byteLength < 4) return false;
      const header = new Uint8Array(arrayBuffer);
      return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // %PDF
    } catch {
      return false;
    }
  }

  /**
   * Main entry point to process, clean, analyze and store a raw PDF file
   */
  static async processPDF(
    file: File,
    onProgress?: (progress: { status: string; message: string; currentPage: number; totalPages: number }) => void
  ): Promise<PDFAnalysisResult> {
    const documentId = "doc_" + Math.random().toString(36).substring(2, 11);
    
    // Check if the file is a real PDF or just contains plain text (virtual restored PDF)
    const isPdf = await this.isRealPdf(file);
    
    let rawText = "";
    let pageCount = 1;
    
    if (isPdf) {
      // 1. Run our raw PDF extractor
      if (onProgress) {
        onProgress({ status: "parsing", message: "PDF Metinleri okunuyor ve ayrıştırılıyor...", currentPage: 0, totalPages: 0 });
      }
      
      const extraction = await extractTextFromPDF(file, (p) => {
        if (onProgress) {
          onProgress({
            status: p.status,
            message: p.message,
            currentPage: p.currentPage,
            totalPages: p.totalPages,
          });
        }
      });
      pageCount = extraction.pageCount;
      rawText = extraction.text;
    } else {
      // 1b. Fallback to direct reading as text
      if (onProgress) {
        onProgress({ status: "parsing", message: "Harici döküman metni yükleniyor...", currentPage: 1, totalPages: 1 });
      }
      
      rawText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string || "");
        reader.onerror = () => reject(new Error("Döküman düz metni okunamadı."));
        reader.readAsText(file);
      });
      
      // Try to predict page count based on page tags or character length
      const pageSelector = /\[Sayfa\s+(\d+)\]/gi;
      const pagesFound = [...rawText.matchAll(pageSelector)];
      if (pagesFound.length > 0) {
        pageCount = Math.max(...pagesFound.map(m => parseInt(m[1], 10)));
      } else {
        pageCount = Math.max(1, Math.ceil(rawText.length / 2000));
      }
    }

    // 2. Perform Quality Control & Meta heuristics
    const { readability, ocrNeeded, cleanTextLength, detectedSubject, documentType } = this.analyzeQuality(rawText, pageCount, file.name);

    const docSizeStr = this.formatBytes(file.size);

    const doc: DB_Document = {
      id: documentId,
      title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
      file_name: file.name,
      file_size: docSizeStr,
      page_count: pageCount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_type: documentType,
      detected_subject: detectedSubject,
      language: "tr",
      last_opened_at: new Date().toISOString(),
      readability,
      ocr_needed: isPdf ? ocrNeeded : false, // Plain text doesn't need OCR representation
      raw_text_length: rawText.length
    };

    // 3. Page separation and page text mapping
    const pages: DB_DocumentPage[] = [];
    
    // Check if the source rawText has structured [Sayfa X] tags
    const hasPageTags = /\[Sayfa\s+\d+\]/i.test(rawText);
    
    if (hasPageTags) {
      const rawPages = rawText.split(/\[Sayfa \d+\]/ig);
      let actualPageNumber = 1;
      for (let i = 0; i < rawPages.length; i++) {
        const textItem = rawPages[i].trim();
        if (!textItem) continue;
        
        const cleanText = textItem.replace(/\s+/g, " ");
        pages.push({
          id: `${documentId}_${actualPageNumber}`,
          document_id: documentId,
          page_number: actualPageNumber,
          raw_text: textItem,
          clean_text: cleanText,
          ocr_used: isPdf ? ocrNeeded : false,
          created_at: new Date().toISOString()
        });
        actualPageNumber++;
      }
    } else {
      // Split rawText into chunks of size ~2000 characters to map virtual pages
      const pageSize = 2000;
      let pos = 0;
      let pageNum = 1;
      while (pos < rawText.length) {
        const textItem = rawText.slice(pos, pos + pageSize).trim();
        if (textItem) {
          const cleanText = textItem.replace(/\s+/g, " ");
          pages.push({
            id: `${documentId}_${pageNum}`,
            document_id: documentId,
            page_number: pageNum,
            raw_text: textItem,
            clean_text: cleanText,
            ocr_used: false,
            created_at: new Date().toISOString()
          });
          pageNum++;
        }
        pos += pageSize;
      }
    }

    // Fallback if split has empty lists
    if (pages.length === 0) {
      pages.push({
        id: `${documentId}_1`,
        document_id: documentId,
        page_number: 1,
        raw_text: rawText,
        clean_text: rawText,
        ocr_used: isPdf ? ocrNeeded : false,
        created_at: new Date().toISOString()
      });
    }

    // 4. Client-side Intelligent Paragraph & Token Chunking
    const chunks = this.createIntelligentChunks(documentId, pages);

    // 5. Write to local database structured stores
    db.addDocument(doc);
    db.addPages(pages);
    db.addChunks(chunks);

    return { doc, pages, chunks };
  }

  /**
   * Dynamic quality checking and subject predicting heuristic
   */
  private static analyzeQuality(text: string, pageCount: number, filename: string) {
    const cleanTextLength = text.replace(/\s+/g, "").length;
    const avgCharsPerPage = pageCount > 0 ? cleanTextLength / pageCount : 0;
    
    let readability: DB_Document["readability"] = "Yüksek";
    let ocrNeeded = false;

    if (cleanTextLength < 30 || avgCharsPerPage < 40) {
      readability = "Düşük";
      ocrNeeded = true;
    } else if (avgCharsPerPage < 150) {
      readability = "Orta";
      ocrNeeded = true; // OCR may help
    }

    // Simple subject predictor
    const lowercaseText = (text + " " + filename).toLowerCase();
    let detectedSubject = "Genel Kültür";
    let documentType = "Ders Notu";

    if (this.containsAny(lowercaseText, ["integral", "türev", "limit", "fonksiyon", "denklem", "trigonometri", "matematik", "logaritma", "geometri", "üçgen"])) {
      detectedSubject = "Matematik";
    } else if (this.containsAny(lowercaseText, ["ivme", "vektör", "newton", "dinamik", "fizik", "kuvvet", "dalga", "optik", "manyetizma", "elektrik", "termodinamik"])) {
      detectedSubject = "Fizik";
    } else if (this.containsAny(lowercaseText, ["asit", "baz", "periyodik", "mol ", "molekül", "atom", "kimya", "katalizör", "kimyasal", "gazlar"])) {
      detectedSubject = "Kimya";
    } else if (this.containsAny(lowercaseText, ["hücre", "biyoloji", "dna", "rna", "solunum", "bitki", "hayvan", "organ", "sindirim", "evrim"])) {
      detectedSubject = "Biyoloji";
    } else if (this.containsAny(lowercaseText, ["cumhuriyet", "padişah", "savaş", "osmanlı", "devrim", "inkılap", "tarihi", "hitit", "roma", "milli mücadele"])) {
      detectedSubject = "Tarih";
    } else if (this.containsAny(lowercaseText, ["şiir", "romancı", "yazar", "edebiyat", "tiyatro", "dil bilgisi", "makale", "türkçe", "gazel", "öykü"])) {
      detectedSubject = "Türkçe / Edebiyat";
    } else if (this.containsAny(lowercaseText, ["harita", "coğrafya", "nüfus", "iklim", "deprem", "kayaç", "akarsu", "bölge", "dağlar"])) {
      detectedSubject = "Coğrafya";
    }

    if (lowercaseText.includes("tez") || lowercaseText.includes("makale") || lowercaseText.includes("research") || lowercaseText.includes("paper")) {
      documentType = "Akademik Makale";
    } else if (lowercaseText.includes("slayt") || lowercaseText.includes("slide") || lowercaseText.includes("ppt")) {
      documentType = "Görsel Slayt";
    } else if (lowercaseText.includes(" sınav") || lowercaseText.includes("vize") || lowercaseText.includes("final") || lowercaseText.includes("quiz")) {
      documentType = "Sınav Gözden Geçirme";
    }

    return {
      readability,
      ocrNeeded,
      cleanTextLength,
      detectedSubject,
      documentType
    };
  }

  private static containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Helper format file bytes size
   */
  private static formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i === 0) return bytes + " Bytes";
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i - 1];
  }

  /**
   * Split pages into chunks of ~1500 chars, preserving page metadata
   */
  private static createIntelligentChunks(documentId: string, pages: DB_DocumentPage[]): DB_DocumentChunk[] {
    const chunks: DB_DocumentChunk[] = [];
    let chunkIndex = 0;
    
    let currentText = "";
    let pageStart = 1;
    let pageEnd = 1;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNum = page.page_number;
      
      // If adding this page raises the chunk above 1800 chars and we already have text, we commit the chunk first
      if (currentText.length + page.clean_text.length > 1800 && currentText.length > 0) {
        chunks.push(this.buildChunkObject(documentId, chunkIndex++, currentText, pageStart, pageEnd));
        currentText = "";
        pageStart = pageNum;
      }
      
      currentText += (currentText ? " " : "") + page.clean_text;
      pageEnd = pageNum;

      // If a single page is giant (>1800 characters), we split it internally
      if (currentText.length > 1800) {
        const sentences = currentText.split(/(?<=[.!?])\s+/);
        let partialText = "";
        
        for (const sentence of sentences) {
          if (partialText.length + sentence.length > 1500 && partialText.length > 100) {
            chunks.push(this.buildChunkObject(documentId, chunkIndex++, partialText, pageStart, pageEnd));
            partialText = "";
          }
          partialText += (partialText ? " " : "") + sentence;
        }
        currentText = partialText;
      }
    }

    // Residual text flush
    if (currentText.trim().length > 0) {
      chunks.push(this.buildChunkObject(documentId, chunkIndex++, currentText, pageStart, pageEnd));
    }

    return chunks;
  }

  /**
   * Build the structural DB_DocumentChunk mapping keywords and a local summary placeholder
   */
  private static buildChunkObject(
    documentId: string,
    idx: number,
    text: string,
    pageStart: number,
    pageEnd: number
  ): DB_DocumentChunk {
    // Generate Turkish local keys
    const keywords = this.extractKeywordsLocally(text);
    const summary = text.slice(0, 140) + (text.length > 140 ? "..." : "");

    return {
      id: `${documentId}_chunk_${idx}`,
      document_id: documentId,
      page_start: pageStart,
      page_end: pageEnd,
      chunk_index: idx,
      chunk_text: text,
      chunk_summary: summary,
      keywords: keywords,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Fast frequency analyzer to pull relevant keywords locally and save server calls
   */
  private static extractKeywordsLocally(text: string): string[] {
    const rawWords = text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'[]/g, " ")
      .split(/\s+/);
      
    const freq: Record<string, number> = {};

    rawWords.forEach(word => {
      const clean = word.trim();
      if (clean.length > 3 && !STOP_WORDS.has(clean) && isNaN(clean as any)) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }
}
