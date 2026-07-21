import React from "react";

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  variant?: "confirm" | "alert";
  tone?: "danger" | "success" | "info";
}

interface ConfirmModalProps {
  confirmDlg: ConfirmState;
  setConfirmDlg: React.Dispatch<React.SetStateAction<ConfirmState>>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ confirmDlg, setConfirmDlg }) => {
  if (!confirmDlg.isOpen) return null;

  const isAlert = confirmDlg.variant === "alert";
  const tone = confirmDlg.tone || (confirmDlg.isDestructive !== false ? "danger" : "info");

  const iconBg = tone === "danger" ? "rgba(179,102,107,0.12)" : tone === "success" ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)";
  const strokeColor = tone === "danger" ? "#b3666b" : tone === "success" ? "#16a34a" : "#2563eb";
  const confirmBtnBg = tone === "danger" ? "#b3666b" : tone === "success" ? "#16a34a" : "var(--text-primary)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={() => setConfirmDlg((prev) => ({ ...prev, isOpen: false }))}
    >
      <div
        className="bento-card"
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "16px",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          animation: "fadeInScale 0.15s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {tone === "danger" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            )}
            {tone === "success" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            )}
            {tone === "info" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            )}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>{confirmDlg.title}</p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{confirmDlg.message}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {!isAlert && (
            <button className="btn-secondary" onClick={() => setConfirmDlg((prev) => ({ ...prev, isOpen: false }))}>
              {confirmDlg.cancelText || "Cancel"}
            </button>
          )}
          <button
            style={{
              backgroundColor: confirmBtnBg,
              color: "#fff",
              border: "none",
              padding: "8px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
            onClick={confirmDlg.onConfirm}
          >
            {confirmDlg.confirmText || (isAlert ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};
