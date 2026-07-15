// Minimal pub-sub toast queue — no provider/context wiring needed, any
// module can call toast.success()/toast.error() directly (including plain
// event handlers outside React), and <ToastHost /> (mounted once in
// Layout) subscribes to render whatever's currently queued.

export interface ToastMessage {
  id: number;
  tone: 'success' | 'error';
  message: string;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const DISMISS_AFTER_MS = 4000;

function emit() {
  for (const listener of listeners) listener(toasts);
}

function push(tone: ToastMessage['tone'], message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, tone, message }];
  emit();
  setTimeout(() => dismissToast(id), DISMISS_AFTER_MS);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
};

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
