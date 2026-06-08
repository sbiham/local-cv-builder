import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Use Vite's native worker loader for maximum reliability
const worker = new PdfWorker();
pdfjsLib.GlobalWorkerOptions.workerPort = worker;

export async function parsePdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Check PDF header magic bytes safely without spreading TypedArrays
    let header = '';
    for (let i = 0; i < 5 && i < uint8Array.length; i++) {
      header += String.fromCharCode(uint8Array[i]);
    }
    if (header !== '%PDF-') {
      throw new Error('File does not appear to be a valid PDF (missing %PDF- header).');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    if (!pdf || pdf.numPages === 0) {
      throw new Error('PDF appears to be empty or could not be read.');
    }
    
    let fullText = '';
    let isImageScan = true;
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items;
      if (items && items.length > 0) {
        // Simplify structures and filter out empty items
        const textItems = items.map(item => {
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          return {
            str: item.str,
            x: transform[4],
            y: transform[5],
            width: item.width || 0,
            height: item.height || 0
          };
        }).filter(item => item.str && item.str.trim() !== '');
        
        if (textItems.length > 0) {
          isImageScan = false; // We found actual text!
          
          // Group items into lines
          const lines = [];
          textItems.sort((a, b) => b.y - a.y);
          
          for (let i = 0; i < textItems.length; i++) {
            const item = textItems[i];
            let foundLine = null;
            for (let j = 0; j < lines.length; j++) {
              const line = lines[j];
              if (Math.abs(line.y - item.y) < 4) {
                foundLine = line;
                break;
              }
            }
            if (foundLine) foundLine.items.push(item);
            else lines.push({ y: item.y, items: [item] });
          }
          
          lines.sort((a, b) => b.y - a.y);
          let pageText = '';
          
          for (let k = 0; k < lines.length; k++) {
            const line = lines[k];
            line.items.sort((a, b) => a.x - b.x);
            let lineText = '';
            let lastX = -1;
            
            for (let m = 0; m < line.items.length; m++) {
              const item = line.items[m];
              if (lastX !== -1 && item.x > lastX + 3) {
                if (!lineText.endsWith(' ') && !item.str.startsWith(' ')) {
                  lineText += ' ';
                }
              }
              lineText += item.str;
              lastX = item.x + item.width;
            }
            
            if (lineText.trim()) pageText += lineText + '\n';
          }
          fullText += pageText + '\n';
        }
      }
    }
    
    // If standard extraction found no text, fallback to Tesseract OCR
    if (isImageScan || !fullText.trim()) {
      console.warn('[PDF Parser] No text layers found. Attempting in-browser OCR via Tesseract.js (this may take a moment)...');
      
      // We will render each page to a canvas and pass it to Tesseract
      let ocrText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`[PDF Parser] OCRing page ${pageNum} of ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNum);
        
        // Render to canvas at a higher scale for better OCR accuracy
        const scale = 2.0; 
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Run OCR on the canvas
        const result = await Tesseract.recognize(
          canvas,
          'eng',
          { logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`) }
        );
        
        ocrText += result.data.text + '\n';
      }
      
      fullText = ocrText;
    }
    
    if (!fullText || !fullText.trim()) {
      throw new Error('No selectable text found in the PDF, and OCR was unable to extract any readable text.');
    }
    
    return fullText;
  } catch (error) {
    console.error('[PDF Parser] Error:', error.message);
    throw error;
  }
}
