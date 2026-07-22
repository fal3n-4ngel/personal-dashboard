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
  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Scratchpad</h1>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {isSavingNote ? "Saving..." : "Saved"}
        </span>
      </div>

      <div style={{ width: "100%" }}>
        <textarea
          value={noteContent}
          onChange={(e) => updateNote(e.target.value)}
          placeholder={isFetchingNote ? "Loading notes..." : "Write your notes here... (Markdown supported mentally)"}
          rows={24}
          style={{
            width: "100%",
            padding: "16px 0",
            fontSize: "14px",
            lineHeight: 1.6,
            fontFamily: "inherit",
            border: "none",
            backgroundColor: "transparent",
            resize: "vertical",
            outline: "none",
            color: "var(--text-primary)",
          }}
        />
      </div>
    </div>
  );
};
