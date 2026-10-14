import type { HandoverOutput } from '../types/handover';

export const SAMPLE_HANDOVER_OUTPUT: HandoverOutput = {
  id: "HO-2026-1014-NIGHT",
  shift: "Night Shift Handover (Ward 4B - Acute Medical)",
  timestamp: "2026-10-13T21:45:00Z",
  summary: {
    patientCount: 6,
    criticalAlerts: 1,
    pendingTasks: 3,
    followupsDue: 2
  },
  rawTranscript: `Handover for Bed 12, John Doe: Blood pressure checked at 21:00, stable at 124/82. Blood test for cardiac enzymes sent at 20:30, result is awaited. When the cardiac enzyme panel arrives, please review immediately. Bed 14, Mary Jenkins: Family called inquiring about tomorrow morning's discharge plan, advised them Dr. Reynolds rounds at 09:00. ECG completion status is not documented in the chart, needs verification with night nurse or technician before morning ward round.`,
  items: {
    pending: [
      {
        id: "p-1",
        category: "pending",
        title: "Blood test result awaited",
        description: "Cardiac enzyme panel sent at 20:30 to pathology. Lab turn-around expected ~22:30.",
        patient: "Bed 12 - John Doe",
        urgency: "high"
      },
      {
        id: "p-2",
        category: "pending",
        title: "Chest X-Ray formal radiology report",
        description: "Portable AP film taken; pending final sign-off by radiologist on call.",
        patient: "Bed 15 - Robert Vance",
        urgency: "medium"
      }
    ],
    followup: [
      {
        id: "f-1",
        category: "followup",
        title: "Review cardiac blood test result when available",
        description: "If troponin is elevated > 14 ng/L, notify Registrar on call immediately for titration.",
        patient: "Bed 12 - John Doe",
        urgency: "critical"
      },
      {
        id: "f-2",
        category: "followup",
        title: "Re-check blood glucose pre-midnight",
        description: "Sliding scale insulin protocol check at 23:30.",
        patient: "Bed 08 - Arthur Dent",
        urgency: "medium"
      }
    ],
    completed: [
      {
        id: "c-1",
        category: "completed",
        title: "Blood pressure checked & recorded",
        description: "BP 124/82 mmHg, HR 74 bpm regular, SpO2 98% room air. Chart updated.",
        patient: "Bed 12 - John Doe",
        urgency: "low"
      },
      {
        id: "c-2",
        category: "completed",
        title: "IV fluid line change completed",
        description: "Normal Saline 1000ml replaced under aseptic technique at 20:00.",
        patient: "Bed 14 - Mary Jenkins",
        urgency: "low"
      }
    ],
    communication: [
      {
        id: "com-1",
        category: "communication",
        title: "Family asked about discharge plan",
        description: "Daughter phoned. Informed that Dr. Reynolds will review during morning rounds at 09:00.",
        patient: "Bed 14 - Mary Jenkins",
        urgency: "low"
      },
      {
        id: "com-2",
        category: "communication",
        title: "Physiotherapy referral handover",
        description: "Mobility assessment requested for post-op mobilization tomorrow morning.",
        patient: "Bed 03 - Evelyn Reed",
        urgency: "low"
      }
    ],
    verification: [
      {
        id: "v-1",
        category: "verification",
        title: "ECG completion status is not documented",
        description: "Order placed at 19:00 but no printout in paper binder or digital trace in PACS. Needs verification.",
        patient: "Bed 14 - Mary Jenkins",
        urgency: "high"
      },
      {
        id: "v-2",
        category: "verification",
        title: "Confirm NPO status prior to morning endoscopy",
        description: "Midnight nil-by-mouth sticker missing from bedside whiteboard.",
        patient: "Bed 07 - Samuel Brooks",
        urgency: "medium"
      }
    ]
  }
};
