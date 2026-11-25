import type { ReactNode } from "react";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Says exactly what will be removed, e.g. "Delete “Growth Equity” and its 9 transactions?" */
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  /** Shown inside the dialog if the action failed (e.g. a 422 from the API). */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmation step before every destructive action. Cancel is focused first, so Enter never deletes by accident. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Delete",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={busy ? () => {} : onCancel}>
      <div className="confirm">
        <div className="confirm__body">{children}</div>
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
