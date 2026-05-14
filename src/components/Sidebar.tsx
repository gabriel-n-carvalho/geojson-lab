import { JsonEditor } from './JsonEditor'
import styles from './Sidebar.module.css'

export function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="GeoJSON editor">
      <div className={styles.body}>
        <JsonEditor />
      </div>
    </aside>
  )
}
