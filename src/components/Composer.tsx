import { ArrowUp, BookOpen, ChevronDown, Lightbulb } from "lucide-react";
import { useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { copy } from "../copy/en";
import { Menu, MenuChoice } from "./ui";

export type AnswerMode = "answer" | "guide";
export type SourceMode = "only_mine" | "mine_plus";

/** A chip's label: the full name on wide screens, a short one on phones so both chips fit one row. */
function ChipText({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className="chip-full">{full}</span>
      <span className="chip-short" aria-hidden="true">
        {short}
      </span>
    </>
  );
}

/**
 * The question box: a textarea and two chips. "Only my notes" or "My notes
 * plus Taku's ideas" (notebooks only), and "Show me the answer" or "Guide
 * me". Each chip opens a small menu with a one line explanation and the full
 * name. Enter sends, Shift and Enter makes a new line.
 */
export function Composer({
  id,
  label,
  placeholder,
  value,
  onChange,
  onSend,
  busy,
  sendLabel,
  answerMode,
  onAnswerMode,
  sourceMode,
  onSourceMode,
  extra,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  sendLabel: string;
  answerMode: AnswerMode;
  onAnswerMode: (mode: AnswerMode) => void;
  sourceMode?: SourceMode;
  onSourceMode?: (mode: SourceMode) => void;
  extra?: ReactNode;
}) {
  const t = copy.composer;
  const area = useRef<HTMLTextAreaElement>(null);
  const empty = value.trim().length === 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!empty && !busy) onSend();
  };
  return (
    <form
      className="composer"
      onSubmit={submit}
      onPointerDown={(e) => {
        // A tap on a chip, a menu choice or send keeps focus where it is. Moving it would bring the
        // tab bar and keyboard back mid tap, the box would jump, and the tap would miss.
        if (!(e.target instanceof HTMLTextAreaElement)) e.preventDefault();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={area}
        rows={1}
        value={value}
        placeholder={placeholder}
        maxLength={2000}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!empty && !busy) onSend();
          }
        }}
      />
      <div className="composer-bar">
        {sourceMode !== undefined && onSourceMode !== undefined && (
          <Menu
            className="chip-menu"
            up
            label={`${t.sourceLabel}: ${t.source[sourceMode].name}`}
            button={
              <span className="chip">
                <BookOpen size={15} aria-hidden="true" /> <ChipText full={t.source[sourceMode].name} short={t.source[sourceMode].short} /> <ChevronDown size={14} aria-hidden="true" />
              </span>
            }
          >
            {(close) =>
              (["only_mine", "mine_plus"] as const).map((m) => (
                <MenuChoice key={m} checked={sourceMode === m} name={t.source[m].name} line={t.source[m].line} onPick={() => (onSourceMode(m), close(), area.current?.focus())} />
              ))
            }
          </Menu>
        )}
        <Menu
          className="chip-menu"
          up
          label={`${t.answerLabel}: ${t.answer[answerMode].name}`}
          button={
            <span className="chip">
              <Lightbulb size={15} aria-hidden="true" /> <ChipText full={t.answer[answerMode].name} short={t.answer[answerMode].short} /> <ChevronDown size={14} aria-hidden="true" />
            </span>
          }
        >
          {(close) =>
            (["answer", "guide"] as const).map((m) => (
              <MenuChoice key={m} checked={answerMode === m} name={t.answer[m].name} line={t.answer[m].line} onPick={() => (onAnswerMode(m), close(), area.current?.focus())} />
            ))
          }
        </Menu>
        <span className="spacer" />
        {extra}
        <button type="submit" className="send" aria-label={sendLabel} disabled={busy || empty}>
          <ArrowUp size={18} aria-hidden="true" />
          <span className="send-label">{sendLabel}</span>
        </button>
      </div>
    </form>
  );
}
