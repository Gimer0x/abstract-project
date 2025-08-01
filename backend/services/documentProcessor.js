const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Document } = require('docx');

/**
 * Process document and extract text based on file type
 * @param {string} filePath - Path to the uploaded file
 * @param {string} originalName - Original filename
 * @returns {Promise<{text: string, pageCount: number}>} - Extracted text content and page count
 */
async function processDocument(filePath, originalName) {
  const fileExtension = path.extname(originalName).toLowerCase();
  
  try {
    switch (fileExtension) {
      case '.pdf':
        return await extractTextFromPDF(filePath);
      case '.docx':
        return await extractTextFromDOCX(filePath);
      case '.txt':
        return await extractTextFromTXT(filePath);
      case '.rtf':
        return await extractTextFromRTF(filePath);
      case '.odt':
        return await extractTextFromODT(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error processing ${fileExtension} file:`, error);
    throw new Error(`Failed to extract text from ${fileExtension} file: ${error.message}`);
  }
}

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<{text: string, pageCount: number}>} - Extracted text and page count
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      pageCount: data.numpages
    };
  } catch (error) {
    throw new Error(`PDF processing error: ${error.message}`);
  }
}

/**
 * Extract text from DOCX file
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<{text: string, pageCount: number}>} - Extracted text and estimated page count
 */
async function extractTextFromDOCX(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const doc = new Document({ sections: [] });
    await doc.load(dataBuffer);
    
    let text = '';
    let paragraphCount = 0;
    
    for (const section of doc.sections) {
      for (const paragraph of section.children) {
        paragraphCount++;
        for (const run of paragraph.children) {
          if (run.text) {
            text += run.text + ' ';
          }
        }
        text += '\n';
      }
    }
    
    // Estimate page count based on paragraphs and text length
    // Rough estimate: ~15-20 paragraphs per page, or ~500 words per page
    const wordCount = text.split(/\s+/).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
    
    return {
      text: text.trim(),
      pageCount: estimatedPages
    };
  } catch (error) {
    throw new Error(`DOCX processing error: ${error.message}`);
  }
}

/**
 * Extract text from TXT file
 * @param {string} filePath - Path to TXT file
 * @returns {Promise<{text: string, pageCount: number}>} - Extracted text and estimated page count
 */
async function extractTextFromTXT(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const wordCount = text.split(/\s+/).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
    
    return {
      text: text,
      pageCount: estimatedPages
    };
  } catch (error) {
    throw new Error(`TXT processing error: ${error.message}`);
  }
}

/**
 * Extract text from RTF file
 * @param {string} filePath - Path to RTF file
 * @returns {Promise<{text: string, pageCount: number}>} - Extracted text and estimated page count
 */
async function extractTextFromRTF(filePath) {
  try {
    const rtfContent = fs.readFileSync(filePath, 'utf8');
    // Simple RTF text extraction - remove RTF formatting tags
    const text = rtfContent
      .replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF commands
      .replace(/\{[^}]*\}/g, '') // Remove RTF groups
      .replace(/\\'/g, "'") // Handle escaped apostrophes
      .replace(/\\"/g, '"') // Handle escaped quotes
      .replace(/\\n/g, '\n') // Handle newlines
      .replace(/\\t/g, '\t') // Handle tabs
      .trim();
    
    const wordCount = text.split(/\s+/).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
    
    return {
      text: text,
      pageCount: estimatedPages
    };
  } catch (error) {
    throw new Error(`RTF processing error: ${error.message}`);
  }
}

/**
 * Extract text from ODT file
 * @param {string} filePath - Path to ODT file
 * @returns {Promise<{text: string, pageCount: number}>} - Extracted text and estimated page count
 */
async function extractTextFromODT(filePath) {
  try {
    // ODT files are ZIP archives containing XML
    // For now, we'll use a simple approach to extract text
    // In a production environment, you might want to use a dedicated ODT parser
    
    const AdmZip = require('adm-zip');
    const xml2js = require('xml2js');
    
    const zip = new AdmZip(filePath);
    const contentXml = zip.getEntry('content.xml');
    
    if (!contentXml) {
      throw new Error('Could not find content.xml in ODT file');
    }
    
    const xmlContent = contentXml.getData().toString('utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    
    // Extract text from the XML structure
    let text = '';
    const extractTextFromNode = (node) => {
      if (typeof node === 'string') {
        text += node + ' ';
      } else if (node && typeof node === 'object') {
        for (const key in node) {
          if (key === '_') {
            text += node[key] + ' ';
          } else if (Array.isArray(node[key])) {
            node[key].forEach(extractTextFromNode);
          } else if (typeof node[key] === 'object') {
            extractTextFromNode(node[key]);
          }
        }
      }
    };
    
    extractTextFromNode(result);
    const wordCount = text.split(/\s+/).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));
    
    return {
      text: text.trim(),
      pageCount: estimatedPages
    };
  } catch (error) {
    // Fallback to simple text extraction if ODT parsing fails
    console.warn('ODT parsing failed, attempting fallback:', error.message);
    return await extractTextFromTXT(filePath);
  }
}

module.exports = {
  processDocument
}; 