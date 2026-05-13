"use client";

import { useState, useRef, useEffect } from "react";
import type { Question, ResponseType } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

interface QuestionEditorProps {
  index: number;
  question: Question;
  onChange: (q: Question) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Drag and drop signals for the optional reorder gesture. */
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

/**
 * Inline editor for a single screening question. Two modes:
 *   - Read: text is rendered, click-to-edit on the body.
 *   - Edit: textarea takes over, blur or Enter saves.
 *
 * The response-type SegmentedControl is always interactive. Drag handle
 * supports HTML5 DnD reordering (bonus feature from the brief).
 */
export function QuestionEditor({
  index,
  question,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: QuestionEditorProps) {
  // Draft is `null` when not editing — we render the live `question.text`.
  // When the user clicks edit, we seed the draft from the current text.
  // This avoids the React-19 "set-state-in-effect" rule and the awkward
  // dance of syncing prop → state.
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(question.text);
  }

  function commit() {
    const trimmed = (draft ?? "").trim();
    if (trimmed.length === 0) {
      setDraft(null);
      return;
    }
    if (trimmed !== question.text) {
      onChange({ ...question, text: trimmed });
    }
    setDraft(null);
  }

  function setResponseType(t: ResponseType) {
    onChange({ ...question, responseType: t });
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "group relative rounded-xl border bg-surface-container-lowest p-lg transition-all duration-150",
        "border-outline-variant hover:border-secondary/40",
        isDragging && "opacity-50",
        isDragOver && "border-secondary ring-2 ring-secondary/30"
      )}
    >
      <div className="flex items-start justify-between gap-md">
        <div className="min-w-0 flex-1 pr-md">
          <div className="flex items-center gap-sm">
            <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
              Question {index + 1}
            </span>
            {question.isCustom && (
              <span className="rounded bg-surface-container-high px-xs py-[2px] text-label-sm text-on-surface-variant">
                Custom
              </span>
            )}
          </div>
          {editing ? (
            <textarea
              ref={textareaRef}
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setDraft(null);
                }
              }}
              rows={3}
              className="mt-xs w-full resize-none rounded-md border border-secondary bg-surface px-sm py-xs text-body-md text-on-surface outline-none focus:ring-2 focus:ring-secondary/30"
            />
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="mt-xs block w-full cursor-text rounded text-left text-body-md text-on-surface transition-colors hover:bg-surface-container-low/60"
            >
              {question.text || (
                <span className="italic text-outline">Click to write a question…</span>
              )}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-xs">
          <IconButton
            label="Edit question"
            icon="edit"
            onClick={startEditing}
          />
          <IconButton
            label="Delete question"
            icon="delete"
            danger
            onClick={onRemove}
          />
        </div>
      </div>

      <div className="mt-md flex flex-wrap items-center justify-between gap-md border-t border-outline-variant pt-md">
        <div className="flex items-center gap-md">
          <span className="text-label-md text-on-surface-variant">Response type</span>
          <SegmentedControl
            value={question.responseType}
            onChange={(v) => setResponseType(v as ResponseType)}
            options={[
              { value: "text", label: "Text" },
              { value: "audio", label: "Audio" },
            ]}
            size="sm"
            ariaLabel={`Response type for question ${index + 1}`}
          />
        </div>
        <div className="flex items-center gap-xs">
          {onMoveUp && (
            <IconButton label="Move up" icon="keyboard_arrow_up" onClick={onMoveUp} />
          )}
          {onMoveDown && (
            <IconButton
              label="Move down"
              icon="keyboard_arrow_down"
              onClick={onMoveDown}
            />
          )}
          <button
            type="button"
            draggable
            aria-label={`Drag question ${index + 1} to reorder`}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="ml-xs cursor-grab text-outline transition-colors group-hover:text-on-surface-variant active:cursor-grabbing"
            title="Drag to reorder"
          >
            <Icon name="drag_indicator" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md text-outline transition-colors",
        danger
          ? "hover:bg-error/10 hover:text-error"
          : "hover:bg-surface-container-high hover:text-on-surface"
      )}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
