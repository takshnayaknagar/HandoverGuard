import { Patient, VerificationFlag, HandoverItem, ShiftInfo } from '../types/clinical';

export const INITIAL_SHIFT_INFO: ShiftInfo = {
  shiftNumber: '#402',
  ward: 'ICU West Wing',
  activeNurse: 'Nurse Sarah Jenkins, RN',
  nurseRole: 'Charge Nurse',
  nurseId: 'NUR-84920',
  timeWindow: 'Day Shift (07:00 - 19:00)',
};

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: '#104',
    roomBed: 'Bed 3B',
    avatarText: '3B',
    name: 'Robert Davis',
    age: 58,
    gender: 'Male',
    condition: 'Post-Op Recovery',
    acuity: 'critical',
    department: 'Intensive Care Unit (ICU)',
    attendingPhysician: 'Dr. Emily Vance, MD',
  },
  {
    id: '#105',
    roomBed: 'Bed 4A',
    avatarText: '4A',
    name: 'Elena Rostova',
    age: 64,
    gender: 'Female',
    condition: 'Cardiac Telemetry & Arrhythmia',
    acuity: 'attention',
    department: 'Intensive Care Unit (ICU)',
    attendingPhysician: 'Dr. Marcus Chen, MD',
  },
  {
    id: '#101',
    roomBed: 'Bed 1C',
    avatarText: '1C',
    name: 'James Wilson',
    age: 42,
    gender: 'Male',
    condition: 'Trauma Observation / Stable',
    acuity: 'stable',
    department: 'Intensive Care Unit (ICU)',
    attendingPhysician: 'Dr. Sarah Connor, MD',
  },
];

export const INITIAL_FLAGS: VerificationFlag[] = [
  {
    id: 'flag-104-1',
    patientId: '#104',
    type: 'Documentation Check',
    title: 'Documentation Check',
    description: 'ECG requested at 4:15 PM, but completion status is not documented.',
    time: '4:15 PM',
    resolved: false,
  },
  {
    id: 'flag-105-1',
    patientId: '#105',
    type: 'Lab Verification',
    title: 'Troponin-I Level Due',
    description: 'Repeat cardiac enzyme panel ordered at 15:30. Awaiting lab accessioning.',
    time: '3:30 PM',
    resolved: false,
  },
];

export const INITIAL_HANDOVER_ITEMS: HandoverItem[] = [
  // Items for Bed 3B (#104)
  {
    id: 'item-1',
    patientId: '#104',
    category: 'PENDING',
    title: 'Blood test result — sent 3:00 PM, result pending',
    details: ['CBC with Differential and Basic Metabolic Panel dispatched to central lab.'],
    time: '3:00 PM',
    tag: '3:00 PM',
  },
  {
    id: 'item-2',
    patientId: '#104',
    category: 'FOLLOW-UP',
    title: 'Action Required',
    details: [
      'Monitor reported dizziness',
      'Check blood test results upon arrival',
    ],
    time: 'Action Required',
    tag: 'Action Required',
    isActionRequired: true,
  },
  {
    id: 'item-3',
    patientId: '#104',
    category: 'COMPLETED',
    title: '6:00 PM Vitals Check',
    details: [
      'BP checked (120/80 mmHg)',
      'Patient stable at 6:00 PM',
    ],
    time: '6:00 PM',
    tag: '6:00 PM',
  },
  {
    id: 'item-4',
    patientId: '#104',
    category: 'COMMUNICATION',
    title: 'Family requested update on discharge timing',
    details: ['Spoke with daughter (POA). Explained pending surgeon clearance and morning lab criteria.'],
    time: 'Family',
    tag: 'Family',
  },

  // Items for Bed 4A (#105)
  {
    id: 'item-5',
    patientId: '#105',
    category: 'PENDING',
    title: 'Troponin series 2 — blood drawn at 16:00',
    details: ['Awaiting stat readout from pathology lab.'],
    time: '4:00 PM',
    tag: '4:00 PM',
  },
  {
    id: 'item-6',
    patientId: '#105',
    category: 'FOLLOW-UP',
    title: 'Continuous Telemetry Rhythm',
    details: [
      'Titrate Heparin infusion as per protocol',
      'Notify on-call cardiologist if PVC frequency > 6/min',
    ],
    time: 'Urgent',
    tag: 'Urgent',
    isActionRequired: true,
  },
  {
    id: 'item-7',
    patientId: '#105',
    category: 'COMPLETED',
    title: 'Medication Administration',
    details: [
      'Metoprolol Tartrate 25mg PO given with water',
      'Oral telemetry rhythm baseline documented in EHR',
    ],
    time: '14:30',
    tag: '14:30',
  },
];

export const SAMPLE_TRANSCRIPTS: string[] = [
  "Patient resting comfortably following morning rounds. Vitals stable: BP 120/80, HR 72, SpO2 98% on room air. IV antibiotics administered at 08:00 without adverse reaction. Pain reported as 2/10 in lower right quadrant. Scheduled for follow-up scan at 14:00.",
  "Bed 3B Robert Davis 58 male post-op recovery. At 3 PM dispatched routine CBC and metabolic panel. Patient later reported transient dizziness upon sitting up, so we held ambulation and need nighttime nurse to re-check orthostatics. BP 120/80 at 6 PM. Daughter called asking about estimated discharge for tomorrow.",
  "Post-op abdominal surgery recovery. Wound dressing clean, dry, and intact. Foley catheter output 45mL/hr clear amber. Pain controlled on oral analgesic. Family visited and was updated on recovery plan.",
];
