import type { HandoverOutput } from '../types/handover';

export const SAMPLE_HANDOVER_OUTPUT: HandoverOutput = {
  id: "DEMO-HANDOVER-001",
  shift: "Fictional Demo Handover",
  timestamp: "2026-10-13T21:45:00Z",
  summary: {
    patientCount: 6,
    criticalAlerts: 0,
    pendingTasks: 3,
    followupsDue: 2
  },
  rawTranscript: `FICTIONAL DEMO — NOT REAL PATIENT DATA. This sample is for demonstrating the handover workflow only. Demo Bed 12: A routine observation was recorded. A laboratory result is pending review by the responsible clinician. Demo Bed 14: A family member asked about the expected discharge plan; the team will provide an update after the next review. The completion status of a requested test is not documented and needs verification. Demo Bed 15: A report is awaiting completion. Demo Bed 03: A mobility assessment has been requested for a future review. Other tasks and statuses must be confirmed from the actual handover notes.`,
  items: {
    pending: [
      {
        id: "p-1",
        category: "pending",
        title: "Laboratory result pending",
        description: "The provided demo notes state that a laboratory result is awaited. Review its status using the appropriate clinical workflow.",
        patient: "Demo Bed 12",
        urgency: "medium"
      },
      {
        id: "p-2",
        category: "pending",
        title: "Report pending",
        description: "The demo notes indicate that a report is awaiting completion. Verify its current status.",
        patient: "Demo Bed 15",
        urgency: "medium"
      }
    ],
    followup: [
      {
        id: "f-1",
        category: "followup",
        title: "Review pending laboratory result",
        description: "The result is not available in this sample. The responsible clinician should review it when available and follow local procedures.",
        patient: "Demo Bed 12",
        urgency: "medium"
      },
      {
        id: "f-2",
        category: "followup",
        title: "Follow up on requested mobility assessment",
        description: "The demo notes state that an assessment was requested. Confirm its status with the responsible team.",
        patient: "Demo Bed 03",
        urgency: "low"
      }
    ],
    completed: [
      {
        id: "c-1",
        category: "completed",
        title: "Routine observation recorded",
        description: "The fictional demo notes state that an observation was recorded. No actual patient measurements are provided.",
        patient: "Demo Bed 12",
        urgency: "low"
      },
      {
        id: "c-2",
        category: "completed",
        title: "Handover communication recorded",
        description: "The demo illustrates recording a completed communication task. Verify completion from actual notes in real use.",
        patient: "Demo Bed 14",
        urgency: "low"
      }
    ],
    communication: [
      {
        id: "com-1",
        category: "communication",
        title: "Discharge plan enquiry",
        description: "A family member asked about the expected discharge plan. An update is to be provided after the next review.",
        patient: "Demo Bed 14",
        urgency: "low"
      },
      {
        id: "com-2",
        category: "communication",
        title: "Mobility assessment request",
        description: "The demo notes state that a mobility assessment was requested. Confirm the request and its status with the responsible team.",
        patient: "Demo Bed 03",
        urgency: "low"
      }
    ],
    verification: [
      {
        id: "v-1",
        category: "verification",
        title: "Requested test completion status is undocumented",
        description: "The sample notes do not establish whether the test was completed. Verify its status with the responsible team.",
        patient: "Demo Bed 14",
        urgency: "medium"
      },
      {
        id: "v-2",
        category: "verification",
        title: "Confirm outstanding task statuses",
        description: "The sample does not establish the current status of all outstanding tasks. Check the actual handover notes before relying on any status.",
        patient: "Demo Bed 07",
        urgency: "medium"
      }
    ]
  }
};

export const SAMPLE_HANDOVERS: HandoverOutput[] = [
  {
    id: "DEMO-BED-12",
    shift: "Fictional Demo — Bed 12",
    timestamp: "2026-10-13T21:45:00Z",
    patientBed: "12",
    summary: {
      patientCount: 1,
      criticalAlerts: 0,
      pendingTasks: 1,
      followupsDue: 1
    },
    rawTranscript:
      "FICTIONAL DEMO — NOT REAL PATIENT DATA. Demo Bed 12: A routine observation was recorded. A laboratory result is pending review by the responsible clinician.",
    items: {
      pending: [
        {
          id: "p-12",
          category: "pending",
          title: "Laboratory result pending",
          description: "A laboratory result is awaiting review by the responsible clinician.",
          patient: "Demo Bed 12",
          urgency: "medium"
        }
      ],
      followup: [
        {
          id: "f-12",
          category: "followup",
          title: "Review laboratory result",
          description: "Review the result when available and follow local procedures.",
          patient: "Demo Bed 12",
          urgency: "medium"
        }
      ],
      completed: [
        {
          id: "c-12",
          category: "completed",
          title: "Routine observation recorded",
          description: "The fictional note states that an observation was recorded; no measurements are provided.",
          patient: "Demo Bed 12",
          urgency: "low"
        }
      ],
      communication: [],
      verification: []
    }
  },
  {
    id: "DEMO-BED-14",
    shift: "Fictional Demo — Bed 14",
    timestamp: "2026-10-13T21:45:00Z",
    patientBed: "14",
    summary: {
      patientCount: 1,
      criticalAlerts: 0,
      pendingTasks: 1,
      followupsDue: 0
    },
    rawTranscript:
      "FICTIONAL DEMO — NOT REAL PATIENT DATA. Demo Bed 14: A family member asked about the expected discharge plan; the team will provide an update after the next review. The completion status of a requested test is not documented and needs verification.",
    items: {
      pending: [
        {
          id: "p-14",
          category: "pending",
          title: "Provide discharge plan update",
          description: "The team will provide an update after the next review.",
          patient: "Demo Bed 14",
          urgency: "low"
        }
      ],
      followup: [],
      completed: [],
      communication: [
        {
          id: "com-14",
          category: "communication",
          title: "Family member asked about discharge plan",
          description: "A family member asked about the expected discharge plan. An update is planned after the next review.",
          patient: "Demo Bed 14",
          urgency: "low"
        }
      ],
      verification: [
        {
          id: "v-14",
          category: "verification",
          title: "Verify requested test status",
          description: "The transcript does not establish whether the requested test was completed. Verify its status with the responsible team.",
          patient: "Demo Bed 14",
          urgency: "medium"
        }
      ]
    }
  },
  {
    id: "DEMO-BED-15",
    shift: "Fictional Demo — Bed 15",
    timestamp: "2026-10-13T21:45:00Z",
    patientBed: "15",
    summary: {
      patientCount: 1,
      criticalAlerts: 0,
      pendingTasks: 1,
      followupsDue: 0
    },
    rawTranscript:
      "FICTIONAL DEMO — NOT REAL PATIENT DATA. Demo Bed 15: A report is awaiting completion.",
    items: {
      pending: [
        {
          id: "p-15",
          category: "pending",
          title: "Report awaiting completion",
          description: "The fictional transcript states that a report is awaiting completion. Verify its current status.",
          patient: "Demo Bed 15",
          urgency: "medium"
        }
      ],
      followup: [],
      completed: [],
      communication: [],
      verification: []
    }
  },
  {
    id: "DEMO-BED-03",
    shift: "Fictional Demo — Bed 03",
    timestamp: "2026-10-13T21:45:00Z",
    patientBed: "03",
    summary: {
      patientCount: 1,
      criticalAlerts: 0,
      pendingTasks: 1,
      followupsDue: 1
    },
    rawTranscript:
      "FICTIONAL DEMO — NOT REAL PATIENT DATA. Demo Bed 03: A mobility assessment has been requested for a future review.",
    items: {
      pending: [
        {
          id: "p-03",
          category: "pending",
          title: "Mobility assessment requested",
          description: "A mobility assessment has been requested for a future review. Its completion is not established by this transcript.",
          patient: "Demo Bed 03",
          urgency: "low"
        }
      ],
      followup: [
        {
          id: "f-03",
          category: "followup",
          title: "Follow up on mobility assessment",
          description: "Confirm the assessment's status with the responsible team at the planned review.",
          patient: "Demo Bed 03",
          urgency: "low"
        }
      ],
      completed: [],
      communication: [],
      verification: []
    }
  }
];