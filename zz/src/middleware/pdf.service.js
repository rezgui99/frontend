const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

let marked;
(async () => {
  marked = (await import('marked')).marked;
})();

class PDFService {
  constructor() {
    this.margins = { top: 50, bottom: 50, left: 50, right: 50 };
  }

  async generateReportPDF(reportContent, metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: this.margins,
          size: 'A4',
          bufferPages: true // Permet de bufferiser les pages pour ajouter footer après coup
        });

        let chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Header avec logo et informations
        this.addHeader(doc, metadata);
        
        // Contenu principal
        this.addMarkdownContent(doc, reportContent);
        
        // Footer
        this.addFooter(doc, metadata);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc, metadata) {
    // Logo/Titre entreprise
    doc.fontSize(24)
       .fillColor('#1f2937')
       .text('RH Analytics Dashboard', 50, 50);

    doc.fontSize(12)
       .fillColor('#6b7280')
       .text(`Rapport généré le: ${new Date().toLocaleDateString('fr-FR')}`, 50, 80);

    if (metadata.company) {
      doc.text(`Entreprise: ${metadata.company}`, 50, 95);
    }

    // Ligne de séparation
    doc.moveTo(50, 120)
       .lineTo(545, 120)
       .strokeColor('#e5e7eb')
       .stroke();

    doc.y = 140;
  }

  addMarkdownContent(doc, markdownContent) {
    const lines = markdownContent.split('\n');
    let currentY = doc.y;

    for (const line of lines) {
      if (currentY > 720) { // Nouvelle page si nécessaire
        doc.addPage();
        currentY = 50;
      }

      if (line.startsWith('# ')) {
        doc.fontSize(20)
           .fillColor('#1f2937')
           .font('Helvetica-Bold')
           .text(line.substring(2), 50, currentY);
        currentY += 30;

        doc.moveTo(50, currentY - 5)
           .lineTo(300, currentY - 5)
           .strokeColor('#3b82f6')
           .lineWidth(2)
           .stroke();
        currentY += 15;

      } else if (line.startsWith('## ')) {
        doc.fontSize(16)
           .fillColor('#374151')
           .font('Helvetica-Bold')
           .text(line.substring(3), 50, currentY);
        currentY += 25;

      } else if (line.startsWith('### ')) {
        doc.fontSize(14)
           .fillColor('#4b5563')
           .font('Helvetica-Bold')
           .text(line.substring(4), 50, currentY);
        currentY += 20;

      } else if (line.startsWith('- ')) {
        doc.fontSize(11)
           .fillColor('#374151')
           .font('Helvetica')
           .text('• ' + line.substring(2), 60, currentY);
        currentY += 18;

      } else if (line.startsWith('**') && line.endsWith('**')) {
        doc.fontSize(12)
           .fillColor('#1f2937')
           .font('Helvetica-Bold')
           .text(line.replace(/\*\*/g, ''), 50, currentY);
        currentY += 18;

      } else if (line.trim()) {
        const textHeight = doc.fontSize(11)
                            .fillColor('#374151')
                            .font('Helvetica')
                            .heightOfString(line, { width: 495 });
        
        doc.text(line, 50, currentY, { width: 495, align: 'left' });
        currentY += textHeight + 8;
      } else {
        currentY += 10;
      }

      doc.y = currentY;
    }
  }

  addFooter(doc, metadata) {
    const range = doc.bufferedPageRange();
    const pageCount = range.count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Ligne de séparation du footer
      doc.moveTo(50, 750)
         .lineTo(545, 750)
         .strokeColor('#e5e7eb')
         .stroke();

      // Texte du footer
      doc.fontSize(8)
         .fillColor('#9ca3af')
         .text(`Page ${i + 1} sur ${pageCount}`, 50, 760, { align: 'left' })
         .text('Rapport confidentiel - RH Analytics', 50, 760, { align: 'right' });
    }
  }

  async generateEmployeeRecommendationPDF(employeeData, recommendations) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: this.margins, bufferPages: true });
        let chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        doc.fontSize(20)
           .fillColor('#1f2937')
           .text('Plan de Développement Personnel', 50, 50);

        doc.fontSize(14)
           .fillColor('#3b82f6')
           .text(`${employeeData.employee_name} - ${employeeData.current_position}`, 50, 80);

        const score = employeeData.overall_development_score || 0;
        const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
        
        doc.fontSize(12)
           .fillColor('#6b7280')
           .text(`Score de développement: `, 50, 110)
           .fillColor(scoreColor)
           .text(`${score}/100`, 200, 110);

        doc.y = 140;
        this.addMarkdownContent(doc, recommendations);

        this.addFooter(doc, {});

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();
