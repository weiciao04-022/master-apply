import { useEffect, useState } from 'react';
import { Modal } from './ui';

/** 頁內確認對話框（取代 window.confirm，預覽框架中也能使用） */
type Req = { message: string; resolve: (ok: boolean) => void };
let push: ((r: Req) => void) | null = null;

export function askConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (push) push({ message, resolve });
    else resolve(false);
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Req | null>(null);
  useEffect(() => {
    push = setReq;
    return () => {
      push = null;
    };
  }, []);
  if (!req) return null;
  const done = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };
  return (
    <Modal
      title="請確認"
      onClose={() => done(false)}
      footer={
        <>
          <span className="spacer" />
          <button className="btn ghost" onClick={() => done(false)}>
            取消
          </button>
          <button className="btn primary" onClick={() => done(true)} autoFocus>
            確定
          </button>
        </>
      }
    >
      <p className="pre">{req.message}</p>
    </Modal>
  );
}
