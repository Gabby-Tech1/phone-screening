"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "error"
  | "unsupported";

interface RecorderState {
  status: RecorderStatus;
  durationMs: number;
  audioDataUrl: string | null;
  audioDurationMs: number | null;
  error: string | null;
}

interface UseAudioRecorderOptions {
  /** Hard cap on recording length. When hit, the recorder auto-stops.
   *  Defaults to 90s — keeps localStorage payloads small. */
  maxDurationMs?: number;
}

interface UseAudioRecorder extends RecorderState {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

const DEFAULT_MAX_DURATION_MS = 90_000;

/**
 * Browser audio capture via MediaRecorder. Returns enough state to render a
 * full record / stop / playback / re-record UI without leaking refs.
 *
 *   - SSR-safe: feature detection deferred until the first interactive call.
 *   - Cleanup on unmount: stops the active MediaRecorder, releases the mic
 *     tracks, and clears the interval timer.
 *   - Encodes to a base64 data URL so the result fits in localStorage and is
 *     transportable without an object-URL lifetime to manage.
 */
export function useAudioRecorder(
  opts: UseAudioRecorderOptions = {}
): UseAudioRecorder {
  const maxDurationMs = opts.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

  const [state, setState] = useState<RecorderState>({
    status: "idle",
    durationMs: 0,
    audioDataUrl: null,
    audioDurationMs: null,
    error: null,
  });

  // We keep mutable bits in refs so async callbacks always see the latest
  // values without forcing re-renders on every chunk.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalDurationRef = useRef<number>(0);

  const cleanupStream = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  // Cleanup on unmount only — capture cleanup in a stable closure.
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    // Snapshot duration before .stop() — the onstop handler reads this.
    finalDurationRef.current = Math.max(1, Date.now() - startedAtRef.current);
    mr.stop();
  }, []);

  const reset = useCallback(() => {
    cleanupStream();
    chunksRef.current = [];
    finalDurationRef.current = 0;
    setState({
      status: "idle",
      durationMs: 0,
      audioDataUrl: null,
      audioDurationMs: null,
      error: null,
    });
  }, [cleanupStream]);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    const Recorder = (
      window as unknown as { MediaRecorder?: typeof MediaRecorder }
    ).MediaRecorder;
    if (!Recorder || !navigator?.mediaDevices?.getUserMedia) {
      setState((s) => ({
        ...s,
        status: "unsupported",
        error: "Your browser does not support audio recording.",
      }));
      return;
    }

    setState({
      status: "requesting",
      durationMs: 0,
      audioDataUrl: null,
      audioDurationMs: null,
      error: null,
    });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "Could not access the microphone.";
      setState({
        status: "error",
        durationMs: 0,
        audioDataUrl: null,
        audioDurationMs: null,
        error: msg,
      });
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mr = new Recorder(stream);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, {
        type: mr.mimeType || "audio/webm",
      });
      const finalDuration = finalDurationRef.current;
      // Tear down the mic before we serialize — long base64 encodes can take
      // a moment, and we don't want the recording dot lingering.
      cleanupStream();
      try {
        const dataUrl = await blobToDataUrl(blob);
        setState({
          status: "recorded",
          durationMs: finalDuration,
          audioDataUrl: dataUrl,
          audioDurationMs: finalDuration,
          error: null,
        });
      } catch {
        setState({
          status: "error",
          durationMs: 0,
          audioDataUrl: null,
          audioDurationMs: null,
          error: "Failed to encode the recording.",
        });
      }
    };

    startedAtRef.current = Date.now();
    mr.start();

    setState({
      status: "recording",
      durationMs: 0,
      audioDataUrl: null,
      audioDurationMs: null,
      error: null,
    });

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= maxDurationMs) {
        stop();
        return;
      }
      setState((s) =>
        s.status === "recording" ? { ...s, durationMs: elapsed } : s
      );
    }, 200);
  }, [cleanupStream, maxDurationMs, stop]);

  return { ...state, start, stop, reset };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

export function formatRecorderTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
