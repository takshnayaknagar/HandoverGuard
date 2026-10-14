import type { HandoverOutput } from '../types/handover';
import { SAMPLE_HANDOVER_OUTPUT } from '../data/sampleData';

/**
 * Handover API Service
 * Supports mock processing and ready integration with Person 2's backend.
 */
export interface GenerateHandoverPayload {
  audioBlob?: Blob;
  audioFile?: File;
  rawText?: string;
}

export const generateHandover = async (
  payload: GenerateHandoverPayload,
  useMock = true
): Promise<HandoverOutput> => {
  if (useMock) {
    // Simulate real AI network turnaround
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // If custom text was provided, customize the sample output transcript
    if (payload.rawText && payload.rawText.trim().length > 0) {
      return {
        ...SAMPLE_HANDOVER_OUTPUT,
        rawTranscript: payload.rawText.trim(),
        timestamp: new Date().toISOString()
      };
    }

    return {
      ...SAMPLE_HANDOVER_OUTPUT,
      timestamp: new Date().toISOString()
    };
  }

  // Real backend endpoint structure for Person 2 integration
  const formData = new FormData();
  if (payload.audioBlob) {
    formData.append('audio', payload.audioBlob, 'recording.webm');
  } else if (payload.audioFile) {
    formData.append('audio', payload.audioFile);
  }
  if (payload.rawText) {
    formData.append('notes', payload.rawText);
  }

  const response = await fetch('/api/handover/process', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Backend responded with status ${response.status}`);
  }

  const data: HandoverOutput = await response.json();
  return data;
};
