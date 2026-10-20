import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '../../types/clinical';
import { SAMPLE_TRANSCRIPTS } from '../../data/mockClinicalData';

interface VoiceNoteScreenProps {
  currentPatient: Patient | null;
  allPatients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onGenerateDashboard: (transcriptText: string) => void;
  onNavigateBack: () => void;
  onOpenAddPatient?: () => void;
}

export const VoiceNoteScreen: React.FC<VoiceNoteScreenProps> = ({
  currentPatient,
  allPatients,
  onSelectPatient,
  onGenerateDashboard,
  onNavigateBack,
  onOpenAddPatient,
}) => {
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(42);
  const [transcript, setTranscript] = useState(
    'Patient resting comfortably following morning rounds. Vitals stable: BP 120/80, HR 72, SpO2 98% on room air. IV antibiotics administered at 08:00 without adverse reaction. Pain reported as 2/10 in lower right quadrant. Scheduled for follow-up scan at 14:00.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedContent, setPastedContent] = useState('');
  const [showAudioUploadToast, setShowAudioUploadToast] = useState(false);
  const [showPatientMenu, setShowPatientMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleAudioUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowAudioUploadToast(true);
      // Simulate speech-to-text processing for audio upload
      setTimeout(() => {
        setTranscript(
          `[Audio Transcription: ${file.name}]\n` +
          'Shift update: Patient received 500mL normal saline. BP rechecked at 122/78 mmHg. Morning blood draw completed and sent to central lab for CBC and electrolytes. Patient complained of slight dizziness when standing; nursing assist requested for ambulation. Surgeon Dr. Vance completed post-op assessment.'
        );
        setShowAudioUploadToast(false);
      }, 1200);
    }
  };

  const handleGenerateClick = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onGenerateDashboard(transcript);
    }, 800);
  };

  const insertPreset = (text: string) => {
    setTranscript((prev) => (prev ? `${prev} ${text}` : text));
  };

  if (!currentPatient) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#eceef0] my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#f2f4f6] text-[#76777d] flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[32px]">mic_off</span>
        </div>
        <h3 className="text-base font-bold text-[#191c1e] mb-1">No Active Patient Selected</h3>
        <p className="text-xs text-[#45464d] max-w-xs mb-4">
          Please admit or select a patient bed before recording handover dictations.
        </p>
        {onOpenAddPatient && (
          <button
            onClick={onOpenAddPatient}
            className="h-11 px-4 bg-[#000000] text-white rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Patient Record</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-8">
      {/* Hidden file input for audio upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Bar / Patient Context */}
      <div className="flex items-center justify-between mb-4 bg-[#f2f4f6] p-3 rounded-xl shadow-sm border border-[#eceef0]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onNavigateBack}
            className="w-10 h-10 rounded-full bg-[#eceef0] flex items-center justify-center text-[#191c1e] hover:bg-[#e6e8ea] active:scale-95 transition-all shrink-0"
            title="Go back to Dashboard"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#45464d]">
              Active Shift Handover
            </div>
            <div 
              onClick={() => setShowPatientMenu(!showPatientMenu)}
              className="text-base font-semibold text-[#191c1e] truncate flex items-center gap-1 cursor-pointer hover:underline"
              title="Click to switch patient"
            >
              <span>Patient ID: {currentPatient.id} | Room {currentPatient.avatarText}</span>
              <span className="material-symbols-outlined text-[16px] text-[#76777d]">arrow_drop_down</span>
            </div>
          </div>
        </div>

        <div className="px-3 py-1 bg-[#86f2e4] text-[#006f66] rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#006a61] animate-pulse"></span>
          <span className="capitalize">{currentPatient.acuity}</span>
        </div>
      </div>

      {/* Patient Picker Dropdown */}
      {showPatientMenu && (
        <div className="mb-4 p-2 bg-white rounded-xl border border-[#eceef0] shadow-md animate-in fade-in duration-150">
          <p className="text-[11px] font-semibold text-[#76777d] uppercase px-2 py-1">Select Patient for Handover Note</p>
          <div className="flex flex-col gap-1">
            {allPatients.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPatient(p);
                  setShowPatientMenu(false);
                }}
                className={`text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                  p.id === currentPatient.id ? 'bg-[#dae2fd] text-[#131b2e] font-semibold' : 'hover:bg-[#f2f4f6] text-[#191c1e]'
                }`}
              >
                <span>{p.roomBed} ({p.id}) - {p.name}</span>
                <span className="text-[10px] uppercase font-bold text-[#45464d]">{p.condition}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio Upload Processing Toast */}
      {showAudioUploadToast && (
        <div className="mb-4 p-3 bg-[#dae2fd] text-[#131b2e] rounded-xl text-xs flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          <span>Transcribing uploaded audio file with clinical speech model...</span>
        </div>
      )}

      {/* Center Recorder Section */}
      <div className="flex flex-col items-center justify-center py-6 bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(15,23,42,0.06)] mb-4 relative overflow-hidden border border-[#eceef0]/60">
        <div className="absolute inset-0 bg-gradient-to-b from-[#000000]/5 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="text-sm font-medium text-[#45464d] mb-4">
          {isRecording ? 'Tap to pause or stop recording' : 'Recording paused. Tap to resume.'}
        </div>

        {/* Glowing Record Button */}
        <div className="relative flex items-center justify-center my-2">
          {isRecording && (
            <div className="absolute w-28 h-28 rounded-full bg-[#000000]/10 animate-ping"></div>
          )}
          <button
            id="record-btn"
            onClick={toggleRecording}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all group cursor-pointer ${
              isRecording ? 'bg-[#000000] text-white' : 'bg-[#ba1a1a] text-white'
            }`}
            title={isRecording ? 'Pause recording' : 'Resume recording'}
            aria-label="Toggle Recording"
          >
            <span className="material-symbols-outlined text-[40px] material-symbols-fill">
              {isRecording ? 'mic' : 'pause'}
            </span>
          </button>
        </div>

        {/* Timer */}
        <div 
          id="timer"
          className="text-2xl font-bold text-[#191c1e] tracking-wider font-mono my-2 tabular-nums"
        >
          {formatTimer(seconds)}
        </div>

        {/* Waveform Visualizer */}
        <div 
          id="waveform"
          className={`flex items-center gap-1.5 h-10 my-3 transition-opacity duration-300 ${
            isRecording ? 'opacity-100' : 'opacity-30'
          }`}
          aria-hidden="true"
        >
          <div className={`w-1 bg-[#000000] rounded-full h-4 ${isRecording ? 'animate-pulse' : ''}`}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-8 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-6 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '300ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-10 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '75ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-5 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '200ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-9 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '350ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-7 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '100ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-3 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '250ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-8 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '50ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-6 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '300ms' }}></div>
          <div className={`w-1 bg-[#000000] rounded-full h-4 ${isRecording ? 'animate-pulse' : ''}`} style={{ animationDelay: '175ms' }}></div>
        </div>

        {/* Secondary Input Options */}
        <div className="flex items-center gap-2 text-xs text-[#45464d] mt-2 pt-3 border-t border-[#eceef0] w-full justify-center">
          <span>Alternative input:</span>
          <button
            type="button"
            onClick={handleAudioUploadClick}
            className="text-[#006a61] font-semibold underline hover:text-[#005049] transition-colors"
          >
            Upload Audio
          </button>
          <span>or</span>
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="text-[#006a61] font-semibold underline hover:text-[#005049] transition-colors"
          >
            Paste Text
          </button>
        </div>
      </div>

      {/* Real-time Live Transcript Preview Box */}
      <div className="flex flex-col bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] mb-5 border border-[#eceef0]/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#006a61]">notes</span>
            <span className="text-sm font-bold text-[#191c1e]">Live Transcript Preview</span>
          </div>
          <span className="text-[10px] text-[#45464d] bg-[#eceef0] px-2 py-0.5 rounded-full font-medium">
            Auto-saving active
          </span>
        </div>

        <p className="text-xs text-[#45464d] mb-3">
          Tap any section to quickly edit auto-generated notes before dashboard compilation.
        </p>

        {/* Editable Text Area */}
        <div className="relative">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={5}
            className="w-full bg-[#f2f4f6] rounded-xl p-3 text-sm text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:bg-white transition-all resize-none leading-relaxed border border-transparent font-sans"
            placeholder="Dictated notes will populate here automatically in real time..."
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-[#76777d] bg-white px-2 py-0.5 rounded shadow-sm border border-[#eceef0] pointer-events-none">
            <span className="material-symbols-outlined text-[13px]">edit</span>
            <span>Editable</span>
          </div>
        </div>

        {/* Quick Dictation Presets */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2 border-t border-[#eceef0]">
          <span className="text-[10px] font-medium text-[#76777d]">Quick Add:</span>
          <button
            onClick={() => insertPreset('ECG completed at 16:30; sinus rhythm noted.')}
            className="text-[10px] px-2 py-1 rounded bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0] transition-colors border border-[#eceef0]"
          >
            + ECG Sinus Rhythm
          </button>
          <button
            onClick={() => insertPreset('Family requested call after evening doctor rounds.')}
            className="text-[10px] px-2 py-1 rounded bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0] transition-colors border border-[#eceef0]"
          >
            + Family Update
          </button>
          <button
            onClick={() => insertPreset('Patient ambulated 15 paces with physical therapist.')}
            className="text-[10px] px-2 py-1 rounded bg-[#f2f4f6] text-[#191c1e] hover:bg-[#eceef0] transition-colors border border-[#eceef0]"
          >
            + Ambulation
          </button>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="sticky bottom-20 z-20 mt-auto pt-1">
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || !transcript.trim()}
          className="w-full h-14 bg-[#000000] text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:bg-neutral-800 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
              <span>Analyzing & Extracting Handover Items...</span>
            </>
          ) : (
            <>
              <span className="text-sm">Generate Handover Dashboard</span>
              <span className="material-symbols-outlined text-[20px]">
                auto_awesome
              </span>
            </>
          )}
        </button>
      </div>

      {/* Paste Text Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#eceef0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eceef0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006a61] text-[20px]">content_paste</span>
                <h3 className="text-sm font-bold text-[#191c1e]">Paste Clinical Notes</h3>
              </div>
              <button 
                onClick={() => setShowPasteModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#76777d] hover:bg-[#eceef0]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-3">
              <textarea
                rows={5}
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Paste physician progress notes, telemetry summaries, or EHR handover excerpts..."
                className="w-full bg-[#f2f4f6] rounded-xl p-3 text-xs text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
              />
              <div className="mt-2 flex gap-1 flex-wrap">
                <span className="text-[10px] text-[#76777d]">Or pick sample:</span>
                <button
                  type="button"
                  onClick={() => setPastedContent(SAMPLE_TRANSCRIPTS[1])}
                  className="text-[10px] text-[#006a61] hover:underline"
                >
                  Post-op Shift Excerpt
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="flex-1 h-9 rounded-lg bg-[#eceef0] text-xs font-semibold text-[#191c1e]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pastedContent.trim()) {
                    setTranscript(pastedContent.trim());
                  }
                  setShowPasteModal(false);
                }}
                className="flex-1 h-9 rounded-lg bg-[#000000] text-xs font-semibold text-white"
              >
                Insert Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
