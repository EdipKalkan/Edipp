/**
 * Utility to extract text from a PDF file client-side.
 * Dynamically loads PDF.js from CDN to guarantee build stability.
 */

interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  status: "idle" | "loading-lib" | "parsing" | "completed" | "error";
  message: string;
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ text: string; pageCount: number }> {
  const updateProgress = (
    status: ExtractionProgress["status"],
    currentPage: number,
    totalPages: number,
    message: string
  ) => {
    if (onProgress) {
      onProgress({ currentPage, totalPages, status, message });
    }
  };

  try {
    updateProgress("loading-lib", 0, 0, "PDF analiz aracı yükleniyor...");

    // Check if pdfjsLib is already loaded
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = (err) => reject(new Error("PDF.js kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin."));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;

    // Set worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    updateProgress("parsing", 0, 0, "Dosya okunuyor...");

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    let fullText = "";

    updateProgress("parsing", 0, pageCount, `PDF yüklendi. Sektörler okunuyor (${pageCount} sayfa)...`);

    for (let i = 1; i <= pageCount; i++) {
      updateProgress("parsing", i, pageCount, `Sayfa ${i}/${pageCount} metinleri çıkarılıyor...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      
      fullText += `\n[Sayfa ${i}]\n${pageText}\n`;
    }

    // Clean multiple spaces and trim
    fullText = fullText.replace(/\s+/g, " ").trim();

    if (fullText.trim().length === 0) {
      throw new Error(
        "PDF dosyasında okunabilir metin bulunamadı. Bu PDF taranmış bir resimden veya kilitli bir dokümandan oluşuyor olabilir."
      );
    }

    updateProgress("completed", pageCount, pageCount, "Metin çıkarma başarıyla tamamlandı!");
    return { text: fullText, pageCount };
  } catch (error: any) {
    console.error("PDF Extraction error:", error);
    updateProgress("error", 0, 0, error.message || "PDF okunurken bilinmeyen hata oluştu.");
    throw error;
  }
}
