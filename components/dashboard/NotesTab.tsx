import React from "react";

interface NotesTabProps {
  noteContent: string;
  updateNote: (content: string) => void;
  isSavingNote: boolean;
  isFetchingNote: boolean;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  noteContent,
  updateNote,
  isSavingNote,
  isFetchingNote,
}) => {
  const lineCount = noteContent ? noteContent.split("\n").length : 0;
  const charCount = noteContent.length;

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Quick Notes</h1>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Auto-saving scratchpad backed by Firestore.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)" }}>
            {lineCount} lines · {charCount} chars
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: isSavingNote ? "var(--accent-expense)" : "#16a34a" }}>
            {isSavingNote ? "Saving…" : "✓ Saved"}
          </span>
        </div>
      </div>

      <div className="bento-card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <textarea
          value={noteContent}
          onChange={(e) => updateNote(e.target.value)}
          placeholder={isFetchingNote ? "Loading notes..." : "Type your notes, to-dos, code snippets, or thoughts here..."}
          rows={22}
          style={{
            width: "100%",
            padding: "20px",
            fontSize: "13.5px",
            lineHeight: 1.6,
            fontFamily: "var(--font-mono, monospace)",
            border: "none",
            borderRadius: "0",
            backgroundColor: "transparent",
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
};
