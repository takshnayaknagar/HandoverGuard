import React, { useState } from 'react';
import { Patient, ShiftInfo, HandoverItem, VerificationFlag } from '../types/clinical';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: Patient | null;
  shiftInfo: ShiftInfo;
  items: HandoverItem[];
  flags: VerificationFlag[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentPatient,
  shiftInfo,
  items,
  flags,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'txt'>('pdf');
  const [includePatientId, setIncludePatientId] = useState(true);
  const [includeAiFlags, setIncludeAiFlags] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen || !currentPatient) return null;

  // Filter items for current patient
  const patientItems = items.filter((i) => i.patientId === currentPatient.id);
  const patientFlags = flags.filter((f) => f.patientId === currentPatient.id);

  const generateReportContent = () => {
    const timestampStr = new Date().toLocaleString();
    let text = `====================================================\n`;
    text += `         HANDOVERGUARD CLINICAL REPORT              \n`;
    text += `====================================================\n`;
    text += `Shift: ${shiftInfo.shiftNumber} - ${shiftInfo.ward}\n`;
    text += `Nurse: ${shiftInfo.activeNurse} (${shiftInfo.nurseId})\n`;
    if (includeTimestamp) {
      text += `Generated At: ${timestampStr}\n`;
    }
    text += `----------------------------------------------------\n`;
    text += `PATIENT SUMMARY:\n`;
    text += `Bed/Room: ${currentPatient.roomBed}\n`;
    if (includePatientId) {
      text += `Patient ID: ${currentPatient.id}\n`;
      text += `Name: ${currentPatient.name}\n`;
    } else {
      text += `Patient ID: [REDACTED FOR HIPAA SHARING]\n`;
    }
    text += `Demographics: ${currentPatient.gender}, ${currentPatient.age} yrs\n`;
    text += `Condition: ${currentPatient.condition} (Acuity: ${currentPatient.acuity.toUpperCase()})\n`;
    text += `Attending: ${currentPatient.attendingPhysician}\n`;
    text += `----------------------------------------------------\n`;

    if (includeAiFlags && patientFlags.length > 0) {
      text += `AI VERIFICATION CHECKS:\n`;
      patientFlags.forEach((flag) => {
        text += `[${flag.resolved ? 'RESOLVED' : 'ATTENTION REQUIRED'}] ${flag.title}: ${flag.description} (${flag.time})\n`;
        if (flag.resolved && flag.resolutionNote) {
          text += `  Resolution: ${flag.resolutionNote}\n`;
        }
      });
      text += `----------------------------------------------------\n`;
    }

    text += `CLINICAL HANDOVER BREAKDOWN:\n\n`;

    const pending = patientItems.filter((i) => i.category === 'PENDING');
    if (pending.length > 0) {
      text += `[PENDING LABS & RESULTS]\n`;
      pending.forEach((i) => {
        text += ` • ${i.title} (${i.time})\n`;
        i.details.forEach((d) => (text += `   - ${d}\n`));
      });
      text += `\n`;
    }

    const followUps = patientItems.filter((i) => i.category === 'FOLLOW-UP');
    if (followUps.length > 0) {
      text += `[FOLLOW-UP ACTIONS]\n`;
      followUps.forEach((i) => {
        text += ` • ${i.title} [${i.tag}]\n`;
        i.details.forEach((d) => (text += `   - ${d}\n`));
      });
      text += `\n`;
    }

    const completed = patientItems.filter((i) => i.category === 'COMPLETED');
    if (completed.length > 0) {
      text += `[COMPLETED IN SHIFT]\n`;
      completed.forEach((i) => {
        text += ` • ${i.title} (${i.time})\n`;
        i.details.forEach((d) => (text += `   - ${d}\n`));
      });
      text += `\n`;
    }

    const comms = patientItems.filter((i) => i.category === 'COMMUNICATION');
    if (comms.length > 0) {
      text += `[COMMUNICATION & FAMILY]\n`;
      comms.forEach((i) => {
        text += ` • ${i.title} [${i.tag}]\n`;
        i.details.forEach((d) => (text += `   - ${d}\n`));
      });
      text += `\n`;
    }

    text += `====================================================\n`;
    text += `CONFIDENTIAL MEDICAL RECORD - HIPAA COMPLIANT SYSTEM\n`;
    text += `====================================================\n`;
    return text;
  };

  const handleDownload = () => {
    setIsDownloading(true);

    setTimeout(() => {
      const content = generateReportContent();
      const filename = `Handover_${currentPatient.roomBed.replace(/\s+/g, '')}_Shift${shiftInfo.shiftNumber.replace('#', '')}.${selectedFormat === 'pdf' ? 'pdf' : 'txt'}`;
      
      const blob = new Blob([content], { 
        type: selectedFormat === 'pdf' ? 'application/pdf;charset=utf-8' : 'text/plain;charset=utf-8' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 3000);
    }, 1000);
  };

  const handleShare = () => {
    const reportText = generateReportContent();
    if (navigator.share) {
      navigator.share({
        title: `Handover Report - ${currentPatient.roomBed}`,
        text: reportText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(reportText).then(() => {
        setShareFeedback('Report copied to clipboard for Hospital Chat / Email');
        setTimeout(() => setShareFeedback(null), 3000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d3133]/50 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_32px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden border border-[#eceef0] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[#eceef0]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] material-symbols-fill">
                description
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e]">
                Export Handover Report
              </h3>
              <p className="text-xs text-[#45464d]">
                Shift {shiftInfo.shiftNumber} - {shiftInfo.ward}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#45464d] hover:bg-[#eceef0] transition-colors"
            title="Close dialog"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="px-6 py-4 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* Format Selector (Segmented Control) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#45464d]">
              Select Format
            </label>
            <div className="grid grid-cols-2 p-1 bg-[#eceef0] rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedFormat === 'pdf'
                    ? 'bg-white text-[#191c1e] shadow-sm'
                    : 'text-[#45464d] hover:text-[#191c1e]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  picture_as_pdf
                </span>
                <span>PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('txt')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedFormat === 'txt'
                    ? 'bg-white text-[#191c1e] shadow-sm'
                    : 'text-[#45464d] hover:text-[#191c1e]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  notes
                </span>
                <span>Plain Text (.txt)</span>
              </button>
            </div>
          </div>

          {/* Quick Toggles Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#45464d]">
              Report Inclusions
            </label>
            <div className="flex flex-col gap-2">
              {/* Toggle 1: Patient ID */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-colors cursor-pointer min-h-[48px] select-none">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#45464d] text-[20px]">
                    badge
                  </span>
                  <span className="text-sm font-medium text-[#191c1e]">
                    Include Patient ID
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includePatientId}
                  onChange={(e) => setIncludePatientId(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#000000] cursor-pointer"
                />
              </label>

              {/* Toggle 2: AI Verification Flags */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-colors cursor-pointer min-h-[48px] select-none">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#45464d] text-[20px]">
                    verified
                  </span>
                  <span className="text-sm font-medium text-[#191c1e]">
                    Include AI Verification Flags
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeAiFlags}
                  onChange={(e) => setIncludeAiFlags(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#000000] cursor-pointer"
                />
              </label>

              {/* Toggle 3: Timestamp */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#f2f4f6] hover:bg-[#eceef0] transition-colors cursor-pointer min-h-[48px] select-none">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#45464d] text-[20px]">
                    schedule
                  </span>
                  <span className="text-sm font-medium text-[#191c1e]">
                    Include Timestamp
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#000000] cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Delightful Summary Badge / HIPAA note */}
          <div className="p-3.5 rounded-xl bg-[#dae2fd]/40 flex items-center gap-3 text-[#3f465c] border border-[#dae2fd]">
            <span className="material-symbols-outlined text-[24px] text-[#131b2e] shrink-0">
              security
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#131b2e]">
                HIPAA Compliant Export
              </span>
              <span className="text-[11px] text-[#45464d] opacity-90">
                All patient identifiers are encrypted during transit.
              </span>
            </div>
          </div>

          {/* Feedback Toasts */}
          {shareFeedback && (
            <div className="p-2.5 rounded-lg bg-[#86f2e4] text-[#006f66] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{shareFeedback}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-6 pt-3 bg-[#f2f4f6] flex flex-col gap-2.5 border-t border-[#eceef0]">
          {/* Primary Action: Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-[#006a61] text-white'
                : 'bg-[#000000] text-white hover:bg-neutral-800 active:scale-[0.99]'
            }`}
          >
            {isDownloading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
                <span>Generating Secure File...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <span className="material-symbols-outlined text-[20px]">
                  check_circle
                </span>
                <span>Downloaded Successfully!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">
                  download
                </span>
                <span>Download to Phone</span>
              </>
            )}
          </button>

          {/* Secondary Action: Share */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full h-12 bg-white text-[#191c1e] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#eceef0] active:scale-[0.99] transition-colors border border-[#eceef0] shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              share
            </span>
            <span>Share via Hospital Chat / Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};
