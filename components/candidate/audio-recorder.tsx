"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import {
  formatRecorderTime,
  useAudioRecorder,
} from "@/lib/use-audio-recorder";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  /** Existing recording (e.g. when the candidate navigates back to a Q). */
  value?: { audioDataUrl: string; audioDurationMs: number } | null;
  onChange: (next: { audioDataUrl: string; audioDurationMs: number } | null) => void;
  /** Hard cap on recording length, in ms. Defaults to 90s. */
  maxDurationMs?: number;
  /** When true, the recorder renders its "unsupported" branch even if the
   *  browser would otherwise allow it. Lets the parent force the text-only
   *  fallback path. */
  disabled?: boolean;
}

/**
 * In-browser audio capture for the candidate flow. Wraps `useAudioRecorder`
 * with a recording UI: a record/stop button, a live timer, a playback bar
 * once a clip is captured, and an obvious "Re-record" reset.
 *
 * Degrades gracefully:
 *   - If `MediaRecorder` isn't available, renders the static placeholder so
 *     the candidate can still answer in text.
 *   - If permission is denied, surfaces the error and offers a retry.
 */
export function AudioRecorder({
  value,
  onChange,
  maxDurationMs,
  disabled,
}: AudioRecorderProps) {
  const recorder = useAudioRecorder({ maxDurationMs });

  // When the recorder commits a new clip, push it upstream. The hook only
  // transitions to `recorded` once — the empty-deps comparison below keeps
  // us from looping if the parent re-renders.
  useEffect(() => {
    if (
      recorder.status === "recorded" &&
      recorder.audioDataUrl &&
      recorder.audioDurationMs &&
      recorder.audioDataUrl !== value?.audioDataUrl
    ) {
      onChange({
        audioDataUrl: recorder.audioDataUrl,
        audioDurationMs: recorder.audioDurationMs,
      });
    }
  }, [recorder.status, recorder.audioDataUrl, recorder.audioDurationMs, value, onChange]);

  // The hook auto-detects unsupported on first start(). For an honest UX we
  // still render an interactive primer button — and surface the unsupported
  // state once it's known.
  if (disabled || recorder.status === "unsupported") {
    return <UnsupportedFallback reason={recorder.error ?? undefined} />;
  }

  // Already have a stored clip and the live recorder is idle → playback mode.
  if (value && recorder.status === "idle") {
    return (
      <Playback
        url={value.audioDataUrl}
        durationMs={value.audioDurationMs}
        onReRecord={() => {
          onChange(null);
          recorder.reset();
        }}
      />
    );
  }

  if (recorder.status === "recording") {
    return (
      <div className="space-y-md rounded-xl border border-error/30 bg-error/5 p-lg text-center">
        <div className="flex items-center justify-center gap-sm">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-error" />
          </span>
          <span className="text-label-md font-semibold uppercase tracking-wider text-error">
            Recording
          </span>
        </div>
        <p className="font-mono text-headline-md tabular-nums text-on-surface">
          {formatRecorderTime(recorder.durationMs)}
        </p>
        <button
          type="button"
          onClick={recorder.stop}
          className="inline-flex items-center gap-sm rounded-full bg-error px-xl py-md text-label-md font-semibold text-on-error transition-all hover:brightness-110 active:scale-[0.97]"
        >
          <Icon name="stop_circle" fill={1} />
          Stop & Save
        </button>
        <p className="text-label-sm text-on-surface-variant">
          Recording will auto-stop at {formatRecorderTime(
            maxDurationMs ?? 90_000
          )}
          .
        </p>
      </div>
    );
  }

  if (recorder.status === "recorded" && recorder.audioDataUrl) {
    return (
      <Playback
        url={recorder.audioDataUrl}
        durationMs={recorder.audioDurationMs ?? recorder.durationMs}
        onReRecord={() => {
          onChange(null);
          recorder.reset();
        }}
      />
    );
  }

  // idle / requesting / error
  const requesting = recorder.status === "requesting";
  const errored = recorder.status === "error";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-surface-container-low p-xl text-center",
        errored ? "border-error/50" : "border-outline-variant"
      )}
    >
      <div
        className={cn(
          "mb-md flex h-16 w-16 items-center justify-center rounded-full",
          errored ? "bg-error/10 text-error" : "bg-secondary/10 text-secondary"
        )}
      >
        <Icon
          name={errored ? "mic_off" : "mic"}
          size={32}
          fill={errored ? 0 : 1}
        />
      </div>
      <p className="text-label-md text-on-surface">
        {errored
          ? "Microphone unavailable"
          : requesting
            ? "Waiting for microphone…"
            : "Record an audio response"}
      </p>
      <p className="mt-xs max-w-[360px] text-body-sm text-on-surface-variant">
        {errored
          ? (recorder.error ??
            "Recording isn't available. You can answer in writing below.")
          : "Or answer in writing below — either is fine."}
      </p>
      <button
        type="button"
        onClick={recorder.start}
        disabled={requesting}
        className={cn(
          "mt-lg inline-flex items-center gap-sm rounded-full px-xl py-md text-label-md font-semibold transition-all active:scale-[0.97]",
          requesting
            ? "cursor-wait bg-outline-variant text-on-primary"
            : "bg-secondary text-white hover:brightness-110 dark:text-black"
        )}
      >
        <Icon name={requesting ? "hourglass_top" : "mic"} fill={1} />
        {requesting ? "Requesting access…" : errored ? "Try again" : "Start recording"}
      </button>
    </div>
  );
}

function Playback({
  url,
  durationMs,
  onReRecord,
}: {
  url: string;
  durationMs: number;
  onReRecord: () => void;
}) {
  return (
    <div className="space-y-md rounded-xl border border-outline-variant bg-surface-container-low p-lg">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-xs text-label-md font-semibold text-secondary">
          <Icon name="check_circle" fill={1} />
          Audio captured · {formatRecorderTime(durationMs)}
        </span>
        <button
          type="button"
          onClick={onReRecord}
          className="inline-flex items-center gap-xs text-label-sm text-on-surface-variant transition-colors hover:text-error"
        >
          <Icon name="refresh" size={18} />
          Re-record
        </button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        src={url}
        controls
        preload="metadata"
        className="w-full"
        aria-label="Recorded response playback"
      />
    </div>
  );
}

function UnsupportedFallback({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-xl text-center">
      <div className="mb-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-variant opacity-60">
        <Icon name="mic_off" size={32} className="text-outline" />
      </div>
      <p className="text-label-md text-on-surface-variant">
        Audio recording isn&rsquo;t available in this browser.
      </p>
      <p className="mt-xs text-body-sm text-outline">
        {reason ?? "Use the written response below to continue."}
      </p>
    </div>
  );
}
