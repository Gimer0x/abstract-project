const PDFDocument = require('pdfkit');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
const fs = require('fs');

/**
 * Export photo processing results to PDF
 * @param {Array} photos - Array of photo objects
 * @param {string} organizedText - Organized text content
 * @param {string} batchId - Batch identifier
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function exportToPDF(photos, organizedText, batchId) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Add title
      doc.fontSize(20).text('Photo OCR Results', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Batch ID: ${batchId}`, { align: 'center' });
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Add summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10).text(`Total photos processed: ${photos.length}`);
      doc.fontSize(10).text(`Successful extractions: ${photos.filter(p => p.extractedText || p.imageDescription).length}`);
      doc.moveDown(2);
      
      // Add organized text
      doc.fontSize(14).text('Extracted Content', { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(organizedText);
      doc.moveDown(2);
      
      doc.end();
      
    } catch (error) {
      reject(new Error(`PDF export error: ${error.message}`));
    }
  });
}

/**
 * Export photo processing results to DOCX
 * @param {Array} photos - Array of photo objects
 * @param {string} organizedText - Organized text content
 * @param {string} batchId - Batch identifier
 * @returns {Promise<Buffer>} - DOCX buffer
 */
async function exportToDOCX(photos, organizedText, batchId) {
  try {
    const children = [
      new Paragraph({
        text: 'Photo OCR Results',
        heading: HeadingLevel.HEADING_1,
        alignment: 'center'
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Batch ID: ${batchId}`,
            size: 24
          })
        ],
        alignment: 'center'
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on: ${new Date().toLocaleString()}`,
            size: 20
          })
        ],
        alignment: 'center'
      }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),
      new Paragraph({
        text: 'Summary',
        heading: HeadingLevel.HEADING_2
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Total photos processed: ${photos.length}`,
            size: 20
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Successful extractions: ${photos.filter(p => p.extractedText || p.imageDescription).length}`,
            size: 20
          })
        ]
      }),
      new Paragraph({ text: '' }),
      new Paragraph({
        text: 'Extracted Content',
        heading: HeadingLevel.HEADING_2
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: organizedText,
            size: 20
          })
        ]
      }),
      new Paragraph({ text: '' })
    ];
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });
    
    return await Packer.toBuffer(doc);
    
  } catch (error) {
    throw new Error(`DOCX export error: ${error.message}`);
  }
}

/**
 * Export photo processing results to TXT
 * @param {Array} photos - Array of photo objects
 * @param {string} organizedText - Organized text content
 * @param {string} batchId - Batch identifier
 * @returns {string} - TXT content
 */
function exportToTXT(photos, organizedText, batchId) {
  try {
    let content = '';
    
    // Add header
    content += 'PHOTO OCR RESULTS\n';
    content += '='.repeat(50) + '\n';
    content += `Batch ID: ${batchId}\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    // Add summary
    content += 'SUMMARY\n';
    content += '-'.repeat(20) + '\n';
    content += `Total photos processed: ${photos.length}\n`;
    content += `Successful extractions: ${photos.filter(p => p.extractedText || p.imageDescription).length}\n\n`;
    
    // Add organized text
    content += 'EXTRACTED CONTENT\n';
    content += '-'.repeat(20) + '\n';
    content += organizedText + '\n\n';
    
    return content;
    
  } catch (error) {
    throw new Error(`TXT export error: ${error.message}`);
  }
}

/**
 * Export photo processing results to RTF
 * @param {Array} photos - Array of photo objects
 * @param {string} organizedText - Organized text content
 * @param {string} batchId - Batch identifier
 * @returns {string} - RTF content
 */
function exportToRTF(photos, organizedText, batchId) {
  try {
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
    rtf += '\\f0\\fs24\\b PHOTO OCR RESULTS\\b0\\par';
    rtf += '\\fs20 Batch ID: ' + batchId + '\\par';
    rtf += 'Generated on: ' + new Date().toLocaleString() + '\\par\\par';
    
    // Add summary
    rtf += '\\b SUMMARY\\b0\\par';
    rtf += 'Total photos processed: ' + photos.length + '\\par';
    rtf += 'Successful extractions: ' + photos.filter(p => p.extractedText || p.imageDescription).length + '\\par\\par';
    
    // Add organized text
    rtf += '\\b EXTRACTED CONTENT\\b0\\par';
    rtf += (organizedText || 'No content available.') + '\\par\\par';
    
    // Add individual photo details
    rtf += '\\b INDIVIDUAL PHOTO DETAILS\\b0\\par';
    
    photos.forEach((photo, index) => {
      rtf += 'Photo ' + (index + 1) + ': ' + photo.originalFilename + '\\par';
      rtf += 'Status: ' + photo.processingStatus + '\\par';
      rtf += 'File size: ' + (photo.fileSize / 1024 / 1024).toFixed(2) + ' MB\\par';
      
      if (photo.extractedText) {
        rtf += 'Extracted Text:\\par';
        rtf += photo.extractedText.replace(/\n/g, '\\par ') + '\\par';
      }
      
      if (photo.imageDescription) {
        rtf += 'Image Description:\\par';
        rtf += photo.imageDescription.replace(/\n/g, '\\par ') + '\\par';
      }
      
      if (photo.errorMessage) {
        rtf += 'Error:\\par';
        rtf += photo.errorMessage.replace(/\n/g, '\\par ') + '\\par';
      }
      
      rtf += '\\par';
    });
    
    rtf += '}';
    return rtf;
    
  } catch (error) {
    throw new Error(`RTF export error: ${error.message}`);
  }
}

module.exports = {
  exportToPDF,
  exportToDOCX,
  exportToTXT,
  exportToRTF
};
