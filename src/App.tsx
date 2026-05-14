import { Toolbar } from './components/Toolbar'
import { LayersPanel } from './components/LayersPanel'
import { MapCanvas } from './components/MapCanvas'
import { Sidebar } from './components/Sidebar'
import { ToastHost } from './components/ToastHost'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import styles from './App.module.css'

function App() {
  useKeyboardShortcuts()

  return (
    <div className={styles.app}>
      <Toolbar />
      <div className={styles.body}>
        <LayersPanel />
        <MapCanvas />
        <Sidebar />
      </div>
      <ToastHost />
    </div>
  )
}

export default App
