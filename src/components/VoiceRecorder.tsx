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
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-card)] p-6 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-[#d1495b] animate-ping' : audioUrl ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
          <h3 className="font-semibold text-[var(--text-primary)] text-base">Direct Voice Recording</h3>
        </div>
        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-[var(--bg-card-muted)] text-[var(--text-secondary)]">
          {isRecording ? formatTime(recordingDuration) : audioUrl ? formatTime(audioDuration || recordingDuration) : '00:00'}
        </span>
      </div>

      {micError && (
        <div className="mb-4 p-3 bg-[#d1495b]/10 border border-[#d1495b]/30 rounded-xl text-xs text-[#d1495b]">
          {micError}
        </div>
      )}

      {/* Recording Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {!audioUrl ? (
          !isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#d1495b] hover:bg-[#b83b4b] disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-[#d1495b]/20 cursor-pointer"
            >
              <Mic className="w-5 h-5 text-white" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#003d5b] hover:bg-[#002b40] text-white font-medium rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-[#003d5b]/30 cursor-pointer animate-pulse"
            >
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
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#00798c] hover:bg-[#006575] text-white cursor-pointer transition-colors shadow-sm"
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
                className="p-2 text-[var(--text-muted)] hover:text-[#d1495b] hover:bg-[#d1495b]/10 rounded-lg transition-colors cursor-pointer"
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

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>High-fidelity browser audio capture</span>
        {isRecording && <span className="text-[#d1495b] font-semibold animate-pulse">● Live Recording</span>}
      </div>
    </div>
  );
};
