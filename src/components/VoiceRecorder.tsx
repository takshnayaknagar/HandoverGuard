import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  onAudioReady: (audioBlob: Blob, audioUrl: string) => void;
  onClearAudio: () => void;
  onUploadAudio: () => void;
  onRequestTextEntry: () => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioReady,
  onClearAudio,
  onUploadAudio,
  onRequestTextEntry,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return null;
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioReady(blob, url);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone error:', err);
      setMicError(
        err instanceof Error
          ? `Microphone access error: ${err.message}. Please check browser permissions or use manual notes below.`
          : 'Failed to access microphone. Please check your browser permissions.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingDuration(0);
    setAudioDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    onClearAudio();
  };

  const togglePlayback = () => {
    if (!audioElementRef.current || !audioUrl) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-colors duration-200 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-[#ba1a1a] animate-ping' : audioUrl ? 'bg-emerald-500' : 'bg-[var(--border-card)]'}`} />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Record Handover</h3>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">Browser microphone</span>
      </div>

      {micError && (
        <div role="alert" className="mb-4 p-3 bg-[#d1495b]/10 border border-[#d1495b]/30 rounded-xl text-xs text-[#d1495b]">
          {micError}
        </div>
      )}

      {/* Recording Actions */}
      <div className="relative flex flex-col items-center gap-3 rounded-xl bg-[var(--bg-card-muted)] p-5 sm:p-6">
        <div className="text-center text-xs font-medium text-[var(--text-secondary)]">
          {isRecording ? 'Recording live audio from this browser' : audioUrl ? 'Recording ready for review or transcription' : 'Start a recording when you are ready'}
        </div>
        {!audioUrl ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
            className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] ${isRecording ? 'bg-[#171717]' : 'bg-[#000000] dark:bg-[#f5f5f5] dark:text-[#050505]'}`}
          >
            <Mic className="h-8 w-8" />
          </button>
        ) : (
          /* Playback Preview */
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-xl">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause recorded audio' : 'Play recorded audio'}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-card-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Volume2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00798c] dark:bg-[#38bdf8] h-full transition-all duration-100"
                    style={{
                      width: `${Number.isFinite(audioDuration) && audioDuration > 0 && Number.isFinite(playbackTime) ? Math.min(100, Math.max(0, (playbackTime / audioDuration) * 100)) : 0}%`
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={resetRecording}
                aria-label="Discard recording and record again"
                className="p-2 min-h-10 min-w-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[#d1495b] hover:bg-[#d1495b]/10 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d1495b]"
                title="Discard & Re-record"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <audio
              ref={audioElementRef}
              src={audioUrl}
              onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                const duration = e.currentTarget.duration;
                setAudioDuration(Number.isFinite(duration) && duration >= 0 ? duration : 0);
              }}
              onEnded={() => {
                setIsPlaying(false);
                setPlaybackTime(0);
              }}
              className="hidden"
            />
          </div>
        )}
        {(isRecording || audioUrl) && (formatTime(isRecording ? recordingDuration : playbackTime) || formatTime(recordingDuration)) && (
          <div className="text-2xl font-bold tracking-wider text-[var(--text-primary)] font-mono tabular-nums" aria-label="Recording duration">
            {formatTime(isRecording ? recordingDuration : playbackTime) || formatTime(recordingDuration)}
          </div>
        )}
        <div className={`flex h-9 items-center gap-1.5 transition-opacity ${isRecording ? 'opacity-100' : 'opacity-25'}`} aria-hidden="true">
          {[4, 8, 6, 10, 5, 9, 7, 3, 8, 6, 4].map((height, index) => (
            <span key={index} className={`w-1 rounded-full bg-[var(--text-primary)] ${isRecording ? 'animate-pulse' : ''}`} style={{ height: `${height * 4}px`, animationDelay: `${index * 75}ms` }} />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1 whitespace-nowrap text-xs text-[var(--text-muted)]">
        <span>Alternate input:</span>
        <button type="button" onClick={onUploadAudio} disabled={disabled} className="min-h-10 px-1 font-semibold text-[#315f9f] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] disabled:opacity-50 dark:text-[#8AB4FF]">Upload Audio</button>
        <span>or</span>
        <button type="button" onClick={onRequestTextEntry} disabled={disabled} className="min-h-10 px-1 font-semibold text-[#315f9f] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] disabled:opacity-50 dark:text-[#8AB4FF]">Paste Text</button>
        {isRecording && <span className="text-[#d1495b] font-semibold animate-pulse">● Live Recording</span>}
      </div>
    </div>
  );
};
