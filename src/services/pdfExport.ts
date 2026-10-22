import { jsPDF } from 'jspdf';
import type { HandoverOutput, HandoverItem } from '../types/handover';

export interface ExportPdfResult {
  success: boolean;
  filename: string;
  pageCount: number;
}

/**
 * Generates a clean, safe filename for the PDF export.
 * Uses handover_<case_id>.pdf if case_id is available, or a date-based fallback.
 */
export function generatePdfFilename(caseId?: string | null, date = new Date()): string {
  if (caseId && caseId.trim()) {
    // Sanitize case ID: allow only alphanumeric characters, dashes, and underscores
    const safeCaseId = caseId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `handover_${safeCaseId}.pdf`;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `handover_${dateStr}.pdf`;
}

interface SectionConfig {
  title: string;
  items: HandoverItem[];
  color: [number, number, number];
}

/**
 * Generates and downloads a readable, professional healthcare-oriented PDF
 * for the currently displayed handover.
 */
export async function exportHandoverToPdf(handover: HandoverOutput): Promise<ExportPdfResult> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  const maxContentY = pageHeight - 55; // room for footer
  let currentY = 40;

  // Colors
  const COLOR_NAVY: [number, number, number] = [0, 61, 91];       // #003d5b
  const COLOR_TEAL: [number, number, number] = [0, 121, 140];     // #00798c
  const COLOR_TEXT_DARK: [number, number, number] = [30, 41, 59]; // #1e293b
  const COLOR_TEXT_MUTED: [number, number, number] = [100, 116, 139]; // #64748b
  const COLOR_BORDER: [number, number, number] = [226, 232, 240]; // #e2e8f0

  // Category Colors
  const COLOR_COMPLETED: [number, number, number] = [0, 121, 140];   // Teal
  const COLOR_PENDING: [number, number, number] = [217, 119, 6];     // Amber/Gold
  const COLOR_FOLLOWUP: [number, number, number] = [37, 99, 235];    // Royal Blue
  const COLOR_COMMUNICATION: [number, number, number] = [0, 61, 91]; // Deep Navy
  const COLOR_UNCLEAR: [number, number, number] = [209, 73, 91];     // Coral/Red

  const effectiveCaseId = handover.caseId || (handover.id?.startsWith('HO-') && handover.id.length > 15 ? undefined : handover.id);
  const effectivePatient = handover.patientReference || null;

  // Function to draw running header on pages > 1
  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text('HandoverGuard', marginX, 32);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('Clinical Shift Handover Summary', marginX + 75, 32);

    if (effectiveCaseId) {
      doc.setFontSize(8);
      doc.text(`Case ID: ${effectiveCaseId}`, pageWidth - marginX, 32, { align: 'right' });
    }

    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.75);
    doc.line(marginX, 38, pageWidth - marginX, 38);
  };

  // Check page break and advance
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > maxContentY) {
      doc.addPage();
      drawRunningHeader();
      currentY = 56;
    }
  };

  // --- PAGE 1: HEADER ---
  // Top decorative teal accent line
  doc.setFillColor(...COLOR_TEAL);
  doc.rect(marginX, 26, contentWidth, 3, 'F');

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('HandoverGuard', marginX, 52);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_TEAL);
  doc.text('Clinical Shift Handover Summary', marginX, 68);

  // Badge on the right
  const badgeText = 'CLINICAL DRAFT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(209, 73, 91);
  doc.setDrawColor(209, 73, 91);
  doc.setLineWidth(0.75);
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(pageWidth - marginX - 90, 42, 90, 18, 3, 3, 'FD');
  doc.text(badgeText, pageWidth - marginX - 45, 54, { align: 'center' });

  // Metadata Card
  const metaY = 82;
  const metaHeight = 50;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.75);
  doc.roundedRect(marginX, metaY, contentWidth, metaHeight, 4, 4, 'FD');

  // Format date
  let formattedDate: string;
  try {
    const d = new Date(handover.createdAt || handover.timestamp);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hour12: false
      });
    } else {
      formattedDate = handover.timestamp || 'Not recorded';
    }
  } catch {
    formattedDate = handover.timestamp || 'Not recorded';
  }

  // Column 1
  const col1X = marginX + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text('Case ID:', col1X, metaY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(effectiveCaseId ? effectiveCaseId : 'Not assigned (New draft)', col1X + 46, metaY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Patient Ref:', col1X, metaY + 36);
  doc.setFont('helvetica', 'normal');
  doc.text(effectivePatient ? effectivePatient : 'Not specified in transcript', col1X + 58, metaY + 36);

  // Column 2
  const col2X = marginX + contentWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Date / Time:', col2X, metaY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, col2X + 54, metaY + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Shift Context:', col2X, metaY + 36);
  doc.setFont('helvetica', 'normal');
  doc.text(handover.shift || 'Ward Handover', col2X + 62, metaY + 36);

  // Verification Notice Box
  const noticeY = metaY + metaHeight + 8;
  const noticeHeight = 36;
  doc.setFillColor(254, 252, 232); // #fefce8
  doc.setDrawColor(245, 158, 11);  // #f59e0b
  doc.setLineWidth(0.75);
  doc.roundedRect(marginX, noticeY, contentWidth, noticeHeight, 4, 4, 'FD');

  // Left solid amber bar
  doc.setFillColor(217, 119, 6);
  doc.rect(marginX, noticeY, 3.5, noticeHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // #92400e
  doc.text('CLINICAL SAFETY VERIFICATION NOTICE', marginX + 10, noticeY + 13);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15); // #78350f
  const noticeText = 'AI-generated draft. Verify all information against the original clinical record before use. This document does not replace professional clinical judgment.';
  const noticeLines = doc.splitTextToSize(noticeText, contentWidth - 20);
  doc.text(noticeLines, marginX + 10, noticeY + 24);

  currentY = noticeY + noticeHeight + 18;

  // --- 5 STRUCTURED CLINICAL CATEGORIES ---
  // 1. Completed Tasks (completed)
  // 2. Pending Tasks (pending)
  // 3. Follow-ups (follow_up)
  // 4. Important Communication (communication)
  // 5. Unclear or Undocumented Information (unclear_or_undocumented)
  const sections: SectionConfig[] = [
    {
      title: 'Completed Tasks',
      items: handover.items.completed || [],
      color: COLOR_COMPLETED
    },
    {
      title: 'Pending Tasks',
      items: handover.items.pending || [],
      color: COLOR_PENDING
    },
    {
      title: 'Follow-ups',
      items: handover.items.followup || [],
      color: COLOR_FOLLOWUP
    },
    {
      title: 'Important Communication',
      items: handover.items.communication || [],
      color: COLOR_COMMUNICATION
    },
    {
      title: 'Unclear or Undocumented Information',
      items: handover.items.verification || [],
      color: COLOR_UNCLEAR
    }
  ];

  for (const section of sections) {
    // Check if we have room for section heading + at least 1 item or empty note
    checkPageBreak(50);

    // Section Header Accent Bar
    doc.setFillColor(...section.color);
    doc.rect(marginX, currentY - 9, 3.5, 12, 'F');

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_TEXT_DARK);
    doc.text(section.title, marginX + 10, currentY);

    const titleWidth = doc.getTextWidth(section.title);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    const countLabel = `(${section.items.length} ${section.items.length === 1 ? 'item' : 'items'})`;
    doc.text(countLabel, marginX + 14 + titleWidth, currentY);

    // Separator line
    currentY += 4;
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 12;

    // Empty section handling
    if (section.items.length === 0) {
      checkPageBreak(24);
      // Clean bullet
      doc.setFillColor(148, 163, 184);
      doc.circle(marginX + 7, currentY - 3, 1.8, 'F');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text('No information documented in this category.', marginX + 18, currentY);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        '(Note: Information was not documented in the transcript; this does not confirm tasks are complete or absent.)',
        marginX + 18,
        currentY
      );
      currentY += 16;
    } else {
      // List items
      for (const item of section.items) {
        // Build clean item text
        let itemHeading = item.title;

        // If urgency exists (e.g. critical or high), prefix it
        if (item.urgency && item.urgency !== 'low' && item.urgency !== 'medium') {
          itemHeading = `[${item.urgency.toUpperCase()}] ${itemHeading}`;
        }

        // If patient is specified on item and distinct
        if (item.patient && (!effectivePatient || !item.patient.includes(effectivePatient))) {
          itemHeading = `[${item.patient}] ${itemHeading}`;
        }

        const lines = doc.splitTextToSize(itemHeading, contentWidth - 22);
        let descLines: string[] = [];
        if (item.description && item.description.trim() && item.description !== item.title) {
          descLines = doc.splitTextToSize(item.description.trim(), contentWidth - 22);
        }

        const itemTotalHeight = lines.length * 11 + descLines.length * 10 + 6;
        checkPageBreak(itemTotalHeight);

        // Bullet point circle
        doc.setFillColor(...section.color);
        doc.circle(marginX + 7, currentY - 3, 2, 'F');

        // Draw item title lines
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR_TEXT_DARK);
        doc.text(lines, marginX + 18, currentY);
        currentY += lines.length * 11;

        // Draw description lines if present
        if (descLines.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...COLOR_TEXT_MUTED);
          doc.text(descLines, marginX + 18, currentY);
          currentY += descLines.length * 10;
        }

        currentY += 4; // gap between items
      }
      currentY += 10; // gap after section
    }
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Footer divider line
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.75);
    doc.line(marginX, 804, pageWidth - marginX, 804);

    // Left: Clinical notice
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text(
      'HandoverGuard • AI-Assisted Clinical Handover Draft • Human verification required',
      marginX,
      818
    );

    // Right: Page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT_DARK);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, 818, { align: 'right' });
  }

  // Generate safe filename and trigger download
  const filename = generatePdfFilename(effectiveCaseId);
  doc.save(filename);

  return {
    success: true,
    filename,
    pageCount: totalPages
  };
}
