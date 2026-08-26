import { useState } from "react";
import { copyToClipboard, exportSave, importSave } from "./game/backup";

type Props = {
  userHash: string;
  onClose: () => void;
};

/**
 * 세이브 백업 모달 — 내보내기(클립보드)·가져오기(붙여넣기).
 * 가져오기는 전체 저장을 덮어쓰므로 확인 단계를 한 번 둔다.
 */
export function SaveBackupModal({ userHash, onClose }: Props) {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [message, setMessage] = useState("");
  const [exported, setExported] = useState("");
  const [pasted, setPasted] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    try {
      const text = await exportSave(userHash);
      setExported(text);
      const copied = await copyToClipboard(text);
      setMessage(
        copied
          ? `클립보드에 복사했습니다 (${(text.length / 1024).toFixed(1)}KB) · 메모장 등 안전한 곳에 붙여넣어 보관하세요`
          : "복사에 실패했습니다 · 아래 텍스트를 길게 눌러 직접 복사하세요",
      );
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!confirming) {
      setConfirming(true);
      setMessage("가져오면 이 기기의 현재 세이브를 전부 덮어씁니다. 한 번 더 누르면 진행합니다.");
      return;
    }
    setBusy(true);
    try {
      const result = await importSave(userHash, pasted);
      if (!result.ok) {
        setConfirming(false);
        setMessage(`가져오기 실패 — ${result.reason}`);
        return;
      }
      setMessage(`복원 완료 (${result.restoredKeys}개 항목) · 적용을 위해 다시 시작합니다…`);
      window.setTimeout(() => window.location.reload(), 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exit-modal backup-modal" role="dialog" aria-modal="true">
      <div className="exit-card backup-card">
        <p className="brand">SAVE BACKUP</p>
        <h2 className="exit-title">세이브 백업</h2>
        <p className="backup-note">
          저장은 이 기기에만 남습니다. 기기를 바꾸거나 앱을 지우기 전에 내보내기로 보관하고,
          새 기기에서 가져오기 하세요. 앱인토스판 ↔ 앱 간 이어하기에도 쓸 수 있습니다.
        </p>

        <div className="event-tabs backup-tabs">
          <button type="button" className={tab === "export" ? "on" : ""} onClick={() => { setTab("export"); setMessage(""); }}>
            내보내기
          </button>
          <button type="button" className={tab === "import" ? "on" : ""} onClick={() => { setTab("import"); setMessage(""); setConfirming(false); }}>
            가져오기
          </button>
        </div>

        {tab === "export" ? (
          <>
            <button type="button" className="cta" disabled={busy} onClick={() => void doExport()}>
              {busy ? "만드는 중…" : "세이브 내보내기 · 클립보드 복사"}
            </button>
            {exported && (
              <textarea
                className="backup-text"
                readOnly
                value={exported}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="내보낸 세이브 데이터"
              />
            )}
          </>
        ) : (
          <>
            <textarea
              className="backup-text"
              placeholder="내보내기로 복사해 둔 텍스트를 여기에 붙여넣으세요"
              value={pasted}
              onChange={(e) => { setPasted(e.target.value); setConfirming(false); }}
              aria-label="가져올 세이브 데이터"
            />
            <button
              type="button"
              className={`cta ${confirming ? "backup-danger" : ""}`}
              disabled={busy || pasted.trim().length === 0}
              onClick={() => void doImport()}
            >
              {busy ? "복원 중…" : confirming ? "정말 덮어쓰고 복원하기" : "세이브 가져오기"}
            </button>
          </>
        )}

        {message && <p className="backup-message">{message}</p>}

        <button type="button" className="cta cta-ghost" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
