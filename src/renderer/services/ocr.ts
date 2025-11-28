import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;

export async function initializeOCR(): Promise<void> {
  if (worker) return;
  
  worker = await createWorker('chi_sim', 1, {
    logger: (m) => console.log('[OCR]', m),
  });
}

export async function recognizeText(imageData: string): Promise<string> {
  if (!worker) {
    await initializeOCR();
  }
  
  if (!worker) {
    throw new Error('OCR worker not initialized');
  }

  const result = await worker.recognize(imageData);
  return result.data.text.trim();
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

