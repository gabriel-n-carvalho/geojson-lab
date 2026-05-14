import { useFeatureStore } from '../store/useFeatureStore'
import { CloseIcon } from './icons'
import styles from './ToastHost.module.css'

export function ToastHost() {
  const toasts = useFeatureStore((s) => s.toasts)
  const dismiss = useFeatureStore((s) => s.dismissToast)

  return (
    <div className={styles.host} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} data-kind={t.kind}>
          <span className={styles.icon} />
          <span className={styles.message}>{t.message}</span>
          <button
            type="button"
            className={styles.close}
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
          >
            <CloseIcon width={12} height={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
