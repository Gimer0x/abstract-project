const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

/**
 * Export summary to PDF format
 * @param {Object} summaryData - Summary data object
 * @param {string} originalFilename - Original document filename
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function exportToPDF(summaryData, originalFilename) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add title
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('Document Summary', { align: 'center' })
         .moveDown();

      // Add original filename
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Original Document: ${originalFilename}`, { align: 'center' })
         .moveDown(2);

      // Add executive summary
      if (summaryData.executiveSummary) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Executive Summary')
           .moveDown();
        
        doc.fontSize(12)
           .font('Helvetica')
           .text(summaryData.executiveSummary)
           .moveDown(2);
      }

      // Add key points
      if (summaryData.keyPoints && summaryData.keyPoints.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Key Points')
           .moveDown();
        
        summaryData.keyPoints.forEach(point => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${point}`)
             .moveDown(0.5);
        });
        doc.moveDown();
      }

      // Add action items
      if (summaryData.actionItems && summaryData.actionItems.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Action Items')
           .moveDown();
        
        summaryData.actionItems.forEach(item => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${item}`)
             .moveDown(0.5);
        });
        doc.moveDown();
      }

      // Add important dates
      if (summaryData.importantDates && summaryData.importantDates.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Important Dates')
           .moveDown();
        
        summaryData.importantDates.forEach(date => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${date}`)
             .moveDown(0.5);
        });
        doc.moveDown();
      }

      // Add relevant names
      if (summaryData.relevantNames && summaryData.relevantNames.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Relevant Names')
           .moveDown();
        
        summaryData.relevantNames.forEach(name => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${name}`)
             .moveDown(0.5);
        });
        doc.moveDown();
      }

      // Add places
      if (summaryData.places && summaryData.places.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Places')
           .moveDown();
        
        summaryData.places.forEach(place => {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`• ${place}`)
             .moveDown(0.5);
        });
        doc.moveDown();
      }

      // Add footer
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export summary to DOCX format
 * @param {Object} summaryData - Summary data object
 * @param {string} originalFilename - Original document filename
 * @returns {Promise<Buffer>} - DOCX buffer
 */
async function exportToDOCX(summaryData, originalFilename) {
  try {
    const children = [];

    // Add title
    children.push(
      new Paragraph({
        text: 'Document Summary',
        heading: HeadingLevel.HEADING_1,
        alignment: 'center'
      }),
      new Paragraph({
        text: `Original Document: ${originalFilename}`,
        alignment: 'center'
      }),
      new Paragraph({ text: '' }) // Empty line
    );

    // Add executive summary
    if (summaryData.executiveSummary) {
      children.push(
        new Paragraph({
          text: 'Executive Summary',
          heading: HeadingLevel.HEADING_2
        }),
        new Paragraph({
          text: summaryData.executiveSummary
        }),
        new Paragraph({ text: '' }) // Empty line
      );
    }

    // Add key points
    if (summaryData.keyPoints && summaryData.keyPoints.length > 0) {
      children.push(
        new Paragraph({
          text: 'Key Points',
          heading: HeadingLevel.HEADING_2
        })
      );
      
      summaryData.keyPoints.forEach(point => {
        children.push(
          new Paragraph({
            text: `• ${point}`,
            bullet: { level: 0 }
          })
        );
      });
      children.push(new Paragraph({ text: '' })); // Empty line
    }

    // Add action items
    if (summaryData.actionItems && summaryData.actionItems.length > 0) {
      children.push(
        new Paragraph({
          text: 'Action Items',
          heading: HeadingLevel.HEADING_2
        })
      );
      
      summaryData.actionItems.forEach(item => {
        children.push(
          new Paragraph({
            text: `• ${item}`,
            bullet: { level: 0 }
          })
        );
      });
      children.push(new Paragraph({ text: '' })); // Empty line
    }

    // Add important dates
    if (summaryData.importantDates && summaryData.importantDates.length > 0) {
      children.push(
        new Paragraph({
          text: 'Important Dates',
          heading: HeadingLevel.HEADING_2
        })
      );
      
      summaryData.importantDates.forEach(date => {
        children.push(
          new Paragraph({
            text: `• ${date}`,
            bullet: { level: 0 }
          })
        );
      });
      children.push(new Paragraph({ text: '' })); // Empty line
    }

    // Add relevant names
    if (summaryData.relevantNames && summaryData.relevantNames.length > 0) {
      children.push(
        new Paragraph({
          text: 'Relevant Names',
          heading: HeadingLevel.HEADING_2
        })
      );
      
      summaryData.relevantNames.forEach(name => {
        children.push(
          new Paragraph({
            text: `• ${name}`,
            bullet: { level: 0 }
          })
        );
      });
      children.push(new Paragraph({ text: '' })); // Empty line
    }

    // Add places
    if (summaryData.places && summaryData.places.length > 0) {
      children.push(
        new Paragraph({
          text: 'Places',
          heading: HeadingLevel.HEADING_2
        })
      );
      
      summaryData.places.forEach(place => {
        children.push(
          new Paragraph({
            text: `• ${place}`,
            bullet: { level: 0 }
          })
        );
      });
      children.push(new Paragraph({ text: '' })); // Empty line
    }

    // Add footer
    children.push(
      new Paragraph({
        text: `Generated on: ${new Date().toLocaleString()}`,
        alignment: 'center'
      })
    );

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
 * Export summary to TXT format
 * @param {Object} summaryData - Summary data object
 * @param {string} originalFilename - Original document filename
 * @returns {Promise<string>} - TXT content
 */
async function exportToTXT(summaryData, originalFilename) {
  try {
    let content = '';

    // Add title
    content += 'DOCUMENT SUMMARY\n';
    content += '='.repeat(50) + '\n\n';
    content += `Original Document: ${originalFilename}\n\n`;

    // Add executive summary
    if (summaryData.executiveSummary) {
      content += 'EXECUTIVE SUMMARY\n';
      content += '-'.repeat(20) + '\n';
      content += summaryData.executiveSummary + '\n\n';
    }

    // Add key points
    if (summaryData.keyPoints && summaryData.keyPoints.length > 0) {
      content += 'KEY POINTS\n';
      content += '-'.repeat(12) + '\n';
      summaryData.keyPoints.forEach(point => {
        content += `• ${point}\n`;
      });
      content += '\n';
    }

    // Add action items
    if (summaryData.actionItems && summaryData.actionItems.length > 0) {
      content += 'ACTION ITEMS\n';
      content += '-'.repeat(14) + '\n';
      summaryData.actionItems.forEach(item => {
        content += `• ${item}\n`;
      });
      content += '\n';
    }

    // Add important dates
    if (summaryData.importantDates && summaryData.importantDates.length > 0) {
      content += 'IMPORTANT DATES\n';
      content += '-'.repeat(16) + '\n';
      summaryData.importantDates.forEach(date => {
        content += `• ${date}\n`;
      });
      content += '\n';
    }

    // Add relevant names
    if (summaryData.relevantNames && summaryData.relevantNames.length > 0) {
      content += 'RELEVANT NAMES\n';
      content += '-'.repeat(15) + '\n';
      summaryData.relevantNames.forEach(name => {
        content += `• ${name}\n`;
      });
      content += '\n';
    }

    // Add places
    if (summaryData.places && summaryData.places.length > 0) {
      content += 'PLACES\n';
      content += '-'.repeat(7) + '\n';
      summaryData.places.forEach(place => {
        content += `• ${place}\n`;
      });
      content += '\n';
    }

    // Add footer
    content += '='.repeat(50) + '\n';
    content += `Generated on: ${new Date().toLocaleString()}\n`;

    return content;
  } catch (error) {
    throw new Error(`TXT export error: ${error.message}`);
  }
}

module.exports = {
  exportToPDF,
  exportToDOCX,
  exportToTXT
}; 