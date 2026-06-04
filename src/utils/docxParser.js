import JSZip from 'jszip';

/**
 * Parses a DOCX file and extracts its text contents client-side.
 * @param {File} file - The uploaded file object.
 * @returns {Promise<string>} The extracted text.
 */
export async function parseDocx(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const parser = new DOMParser();
    const paragraphs = [];

    // Helper to extract paragraphs from a specific XML content string
    const extractFromXml = (xmlString) => {
      const doc = parser.parseFromString(xmlString, 'application/xml');
      const pElements = doc.getElementsByTagName('w:p');
      const localParagraphs = [];

      for (let i = 0; i < pElements.length; i++) {
        const p = pElements[i];
        
        // Find if this is part of a list
        let isBullet = false;
        const numPr = p.getElementsByTagName('w:numPr');
        if (numPr && numPr.length > 0) {
          isBullet = true;
        }

        const runs = p.getElementsByTagName('w:r');
        let pText = '';
        for (let j = 0; j < runs.length; j++) {
          const r = runs[j];
          const tElements = r.getElementsByTagName('w:t');
          for (let k = 0; k < tElements.length; k++) {
            pText += tElements[k].textContent || '';
          }
        }
        
        const cleanedText = pText.trim();
        if (cleanedText) {
          // If it's a bullet, prepend a marker so our structured parser knows
          localParagraphs.push(isBullet ? `• ${cleanedText}` : cleanedText);
        }
      }
      return localParagraphs;
    };

    // 1. Try word/document.xml first (the main body)
    if (zip.files['word/document.xml']) {
      const docXml = await zip.files['word/document.xml'].async('text');
      const docParas = extractFromXml(docXml);
      paragraphs.push(...docParas);
    }

    // 2. If main document has little or no text, extract from headers (templates often place CVs inside headers)
    if (paragraphs.length < 5) {
      for (const filename of Object.keys(zip.files)) {
        if (filename.startsWith('word/header') && filename.endsWith('.xml')) {
          const headerXml = await zip.files[filename].async('text');
          const headerParas = extractFromXml(headerXml);
          paragraphs.push(...headerParas);
        }
      }
    }

    // 3. Fallback: Search all XML files in the word directory for text (excluding properties)
    if (paragraphs.length < 3) {
      for (const filename of Object.keys(zip.files)) {
        if (filename.endsWith('.xml') && 
            !filename.includes('styles.xml') && 
            !filename.includes('theme') && 
            !filename.includes('settings.xml') && 
            !filename.includes('fontTable.xml') &&
            !filename.startsWith('word/header') &&
            filename !== 'word/document.xml') {
          const miscXml = await zip.files[filename].async('text');
          const miscParas = extractFromXml(miscXml);
          paragraphs.push(...miscParas);
        }
      }
    }

    return paragraphs.join('\n');
  } catch (error) {
    console.error('Error parsing DOCX file:', error);
    throw error;
  }
}
