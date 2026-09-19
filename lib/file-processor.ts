// StageX AI — Multi-Format File Processor Engine
// Supports PDF, DOC, DOCX, TXT, PPT, PPTX, PNG, JPG, JPEG, WEBP
// Extracts plain text, XML paragraphs, slide text, and prepares multimodal payloads for Gemini

export interface ProcessedFileResult {
  fileName: string;
  filename?: string;
  name?: string;
  fileSize: number;
  size?: number;
  mimeType: string;
  extractedText: string;
  base64?: string;
  fileData?: { inlineData: { mimeType: string; data: string } };
  isMultimodalReady: boolean;
  pageCount?: number;
  wordCount: number;
  error?: string;
}

/**
 * Extracts text from DOCX files by scanning for word/document.xml paragraph strings
 */
function extractDocxTextFromBuffer(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(uint8);

    // Look for XML text tags <w:t>...</w:t> or <w:t xml:space="preserve">...</w:t>
    const matches = raw.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi);
    if (matches && matches.length > 0) {
      const textParts = matches.map((m) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
      return textParts.join(" ");
    }

    // Fallback: strip all XML tags
    const clean = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length > 50) {
      return clean.slice(0, 15000);
    }
  } catch (e) {
    console.warn("[Docx Parser Warning]", e);
  }
  return "";
}

/**
 * Extracts text from PPTX files by scanning for slide text <a:t>...</a:t>
 */
function extractPptxTextFromBuffer(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(uint8);

    const matches = raw.match(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi);
    if (matches && matches.length > 0) {
      const textParts = matches.map((m) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
      return textParts.join(" ");
    }
  } catch (e) {
    console.warn("[Pptx Parser Warning]", e);
  }
  return "";
}

/**
 * Extracts readable strings and text streams from PDF buffer
 */
function extractPdfTextFromBuffer(arrayBuffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("latin1");
    const raw = decoder.decode(uint8);

    const textChunks: string[] = [];
    // Extract strings inside BT (Begin Text) ... ET (End Text) or (text) Tj
    const tjMatches = raw.match(/\(([^)]+)\)\s*Tj/g);
    if (tjMatches) {
      tjMatches.forEach((m) => {
        const text = m.replace(/\)\s*Tj$/, "").replace(/^\(/, "").trim();
        if (text && text.length > 1) textChunks.push(text);
      });
    }

    if (textChunks.length > 5) {
      return textChunks.join(" ");
    }

    // Fallback: look for stream blocks
    const streamMatches = raw.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
    if (streamMatches) {
      const streamText = streamMatches
        .map((s) => s.replace(/stream|endstream/g, "").replace(/[^a-zA-Z0-9\s.,:;!?'"()\-]/g, " ").trim())
        .filter((s) => s.length > 20)
        .join("\n");
      if (streamText.length > 50) return streamText.slice(0, 10000);
    }
  } catch (e) {
    console.warn("[PDF Parser Warning]", e);
  }
  return "";
}

/**
 * Converts ArrayBuffer to standard base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof window !== "undefined" && window.btoa) {
    return window.btoa(binary);
  }
  return Buffer.from(buffer).toString("base64");
}

/**
 * Main file processing routine for Browser and Node
 */
export async function processUploadFile(file: File): Promise<ProcessedFileResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type || "application/octet-stream";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // 10MB Max size validation
  if (fileSize > 10 * 1024 * 1024) {
    return {
      fileName,
      fileSize,
      mimeType,
      extractedText: "",
      isMultimodalReady: false,
      wordCount: 0,
      error: "File exceeds 10MB size limit.",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = bufferToBase64(arrayBuffer);

    let extractedText = "";
    let isMultimodalReady = false;

    // Plain Text (.txt, .md, .csv, .json, .rtf)
    if (
      mimeType.startsWith("text/") ||
      ["txt", "md", "csv", "json", "rtf", "log"].includes(ext)
    ) {
      const decoder = new TextDecoder("utf-8");
      extractedText = decoder.decode(arrayBuffer).trim();
      isMultimodalReady = false;
    }
    // PDF Documents
    else if (mimeType === "application/pdf" || ext === "pdf") {
      extractedText = extractPdfTextFromBuffer(arrayBuffer);
      isMultimodalReady = true; // Gemini natively supports application/pdf inlineData
    }
    // Microsoft Word (.docx, .doc)
    else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      ["docx", "doc"].includes(ext)
    ) {
      extractedText = extractDocxTextFromBuffer(arrayBuffer);
      isMultimodalReady = false;
    }
    // Microsoft PowerPoint (.pptx, .ppt)
    else if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.ms-powerpoint" ||
      ["pptx", "ppt"].includes(ext)
    ) {
      extractedText = extractPptxTextFromBuffer(arrayBuffer);
      isMultimodalReady = false;
    }
    // Images (.png, .jpg, .jpeg, .webp, .svg)
    else if (
      mimeType.startsWith("image/") ||
      ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)
    ) {
      extractedText = `[Uploaded Image: ${fileName}]`;
      isMultimodalReady = true; // Gemini natively performs OCR and vision extraction
    } else {
      // General binary fallback
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(arrayBuffer);
      const clean = raw.replace(/[^a-zA-Z0-9\s.,:;!?'"()\-]/g, " ").replace(/\s+/g, " ").trim();
      if (clean.length > 30) {
        extractedText = clean.slice(0, 5000);
      }
    }

    const words = extractedText.split(/\s+/).filter(Boolean);

    const resolvedMime = mimeType || (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "application/octet-stream");
    return {
      fileName,
      filename: fileName,
      name: fileName,
      fileSize,
      size: fileSize,
      mimeType: resolvedMime,
      extractedText: extractedText.trim(),
      base64,
      fileData: base64 ? { inlineData: { mimeType: resolvedMime, data: base64 } } : undefined,
      isMultimodalReady,
      wordCount: words.length,
    };
  } catch (err: unknown) {
    return {
      fileName,
      fileSize,
      mimeType,
      extractedText: "",
      isMultimodalReady: false,
      wordCount: 0,
      error: `Failed to process file: ${(err as Error)?.message || "Unknown error"}`,
    };
  }
}
