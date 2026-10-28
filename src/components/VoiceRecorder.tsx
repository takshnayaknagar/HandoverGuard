import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  onAudioReady: (audioBlob: Blob, audioUrl: string) => void;
  onClearAudio: () => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioReady,
  onClearAudio,
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

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
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
    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 transition-colors duration-200 sm:p-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-[#b54747] animate-ping' : audioUrl ? 'bg-emerald-500' : 'bg-[var(--border-card)]'}`} />
          <h3 className="font-semibold text-[var(--text-primary)] text-base">Direct Voice Recording</h3>
        </div>
        <span className="self-end sm:self-auto text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-[var(--bg-card-muted)] text-[var(--text-secondary)]" aria-label="Recording duration">
          {isRecording ? formatTime(recordingDuration) : audioUrl ? formatTime(audioDuration || recordingDuration) : '00:00'}
        </span>
      </div>

      {micError && (
        <div role="alert" className="mb-4 p-3 bg-[#d1495b]/10 border border-[#d1495b]/30 rounded-xl text-xs text-[#d1495b]">
          {micError}
        </div>
      )}

      {/* Recording Actions */}
      <div className="relative flex flex-col items-center gap-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)]/45 p-4 sm:p-5">
        <div className="text-center text-xs font-medium text-[var(--text-secondary)]">
          {isRecording ? 'Recording live audio from this browser' : audioUrl ? 'Recording ready for review or transcription' : 'Start a recording when you are ready'}
        </div>
        {!audioUrl ? (
          !isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              aria-label="Start voice recording"
              className="flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-full bg-[#DC3535] px-3 py-3.5 font-medium text-white transition-colors hover:bg-[#B82B2B] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1]"
            >
              <Mic className="h-8 w-8 text-white" />
              <span className="text-xs font-bold tracking-[0.16em]">RECORD</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop voice recording"
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-4 py-3.5 text-center font-medium text-white transition-colors hover:bg-[#292929] sm:w-auto sm:min-w-56 cursor-pointer animate-pulse touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1]"            >
              <Square className="w-5 h-5 text-[#edae49] fill-[#edae49]" />
              <span>Stop Recording ({formatTime(recordingDuration)})</span>
            </button>
          )
        ) : (
          /* Playback Preview */
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-xl">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause recorded audio' : 'Play recorded audio'}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4ea899] text-white transition-colors hover:bg-[#3d8a7c] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1]"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Volume2 className="w-3.5 h-3.5 text-[#00798c] dark:text-[#38bdf8]" />
                    {formatTime(playbackTime)}
                  </span>
                  <span className="font-mono">{formatTime(audioDuration || recordingDuration)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00798c] dark:bg-[#38bdf8] h-full transition-all duration-100"
                    style={{
                      width: `${audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0}%`
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
              onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
              onEnded={() => {
                setIsPlaying(false);
                setPlaybackTime(0);
              }}
              className="hidden"
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col items-start gap-2 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>High-fidelity browser audio capture</span>
        {isRecording && <span className="text-[#d1495b] font-semibold animate-pulse">● Live Recording</span>}
      </div>
    </div>
  );
};
