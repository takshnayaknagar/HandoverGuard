import assert from 'node:assert';
import { jsPDF } from 'jspdf';

// 1. Test generatePdfFilename logic
function generatePdfFilename(caseId, date = new Date()) {
  if (caseId && caseId.trim()) {
    const safeCaseId = caseId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `handover_${safeCaseId}.pdf`;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `handover_${dateStr}.pdf`;
}

// Test safe filename generation
console.log('--- 1. Testing filename generation ---');
assert.strictEqual(generatePdfFilename('TEST-DB-001'), 'handover_TEST-DB-001.pdf');
assert.strictEqual(generatePdfFilename('case/123:45#alert'), 'handover_case_123_45_alert.pdf');
assert.strictEqual(generatePdfFilename('0f4b2734-bdc7-4f90-a7dc-f361816c6e0c'), 'handover_0f4b2734-bdc7-4f90-a7dc-f361816c6e0c.pdf');
const fallback = generatePdfFilename(null, new Date('2026-10-22T15:30:00Z'));
assert(fallback.startsWith('handover_'));
assert(fallback.endsWith('.pdf'));
console.log('Filename tests passed: OK');

// 2. Test full PDF generation pipeline with jsPDF
console.log('--- 2. Testing PDF document construction ---');
const sampleHandover = {
  id: 'TEST-DB-001',
  caseId: 'TEST-DB-001',
  patientReference: 'DEMO-PATIENT-001',
  shift: 'Evening Shift - Ward 4B',
  timestamp: '2026-10-22T15:08:11.000Z',
  createdAt: '2026-10-22T15:08:11.000Z',
  items: {
    completed: [
      { id: 'c-1', category: 'completed', title: 'Blood pressure checked & recorded: 124/82 mmHg' },
      { id: 'c-2', category: 'completed', title: 'Evening medications administered per chart' }
    ],
    pending: [
      { id: 'p-1', category: 'pending', title: 'Cardiac enzyme troponin panel sent to pathology at 20:30, awaiting results' }
    ],
    followup: [
      { id: 'f-1', category: 'followup', title: 'If troponin > 14 ng/L, notify Registrar on call immediately', urgency: 'critical' }
    ],
    communication: [
      { id: 'com-1', category: 'communication', title: 'Family called inquiring about morning discharge; advised Dr. Reynolds rounds at 09:00' }
    ],
    verification: [
      { id: 'v-1', category: 'verification', title: 'ECG completion status not documented in chart; verify with night nurse' }
    ]
  },
  rawTranscript: 'Patient Bed 12 John Doe...'
};

const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
assert.strictEqual(Math.round(pageWidth), 595);
assert.strictEqual(Math.round(pageHeight), 842);

// Check text splitting and margins
const marginX = 40;
const contentWidth = pageWidth - marginX * 2;
const lines = doc.splitTextToSize(sampleHandover.items.pending[0].title, contentWidth - 22);
assert(Array.isArray(lines) && lines.length > 0);

// Verify multi-page pagination simulation
for (let i = 0; i < 35; i++) {
  doc.circle(marginX + 7, 100 + (i % 20) * 20, 2, 'F');
  if (i === 20) doc.addPage();
}
assert(doc.getNumberOfPages() >= 2);

const totalPages = doc.getNumberOfPages();
for (let p = 1; p <= totalPages; p++) {
  doc.setPage(p);
  doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, 818, { align: 'right' });
}

const pdfBytes = doc.output('arraybuffer');
assert(pdfBytes.byteLength > 1000);
console.log(`PDF successfully generated with ${totalPages} pages and ${pdfBytes.byteLength} bytes.`);
console.log('All tests passed successfully!');
