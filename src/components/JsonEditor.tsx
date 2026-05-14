import { useEffect, useRef, useState } from 'react'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  Decoration,
  type DecorationSet,
} from '@codemirror/view'
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
} from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { useFeatureStore } from '../store/useFeatureStore'
import { checkGeoJSON } from '../lib/geojson-validate'
import { computeFeatureRanges } from '../lib/feature-json-ranges'
import { CopyIcon } from './icons'
import styles from './JsonEditor.module.css'

const setHighlightRange = StateEffect.define<{ fromLine: number; toLine: number } | null>()

const selectedLineDecoration = Decoration.line({ class: 'cm-selectedFeature' })

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (!effect.is(setHighlightRange)) continue
      if (effect.value === null) return Decoration.none
      const { fromLine, toLine } = effect.value
      const doc = tr.state.doc
      const builder = new RangeSetBuilder<Decoration>()
      const first = Math.max(1, fromLine + 1)
      const last = Math.min(doc.lines, toLine + 1)
      for (let n = first; n <= last; n++) {
        const line = doc.line(n)
        builder.add(line.from, line.from, selectedLineDecoration)
      }
      return builder.finish()
    }
    return deco.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

const usePrefersDark = () => {
  const [dark, setDark] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return dark
}

export function JsonEditor() {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const localChangeRef = useRef(false)
  const dark = usePrefersDark()

  const features = useFeatureStore((s) => s.features)
  const lastEditSource = useFeatureStore((s) => s.lastEditSource)
  const replaceAll = useFeatureStore((s) => s.replaceAll)
  const selectedId = useFeatureStore((s) => s.selectedId)
  const pushToast = useFeatureStore((s) => s.pushToast)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(features, null, 2))
      pushToast('success', 'Copied GeoJSON to clipboard')
    } catch {
      pushToast('error', 'Clipboard access denied')
    }
  }

  const [status, setStatus] = useState<{ state: 'ok' | 'error'; message: string }>({
    state: 'ok',
    message: 'Valid GeoJSON',
  })

  useEffect(() => {
    if (!hostRef.current) return

    const initial = JSON.stringify(features, null, 2)
    let debounce: number | null = null

    const onUpdate = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      const text = update.state.doc.toString()
      if (debounce) window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        try {
          const parsed = JSON.parse(text)
          const result = checkGeoJSON(parsed)
          if (!result.ok) {
            setStatus({ state: 'error', message: result.error })
            return
          }
          setStatus({ state: 'ok', message: `Valid · ${result.value.features.length} feature(s)` })
          localChangeRef.current = true
          replaceAll(result.value, 'editor')
        } catch (err) {
          setStatus({ state: 'error', message: `JSON: ${(err as Error).message}` })
        }
      }, 250)
    })

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initial,
        extensions: [
          lineNumbers(),
          foldGutter(),
          highlightActiveLine(),
          history(),
          indentOnInput(),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          json(),
          dark ? oneDark : [],
          highlightField,
          onUpdate,
          EditorView.theme({
            '&': { height: '100%', backgroundColor: 'transparent' },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              borderRight: '1px solid var(--border)',
            },
          }),
        ],
      }),
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
      if (debounce) window.clearTimeout(debounce)
    }
    // `features` seeds initial doc only; subsequent changes are synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, replaceAll])

  // Push external changes (map edits, imports) into the editor.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (localChangeRef.current && lastEditSource === 'editor') {
      localChangeRef.current = false
      return
    }
    const next = JSON.stringify(features, null, 2)
    const current = view.state.doc.toString()
    if (next === current) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: next } })
    setStatus({ state: 'ok', message: `Valid · ${features.features.length} feature(s)` })
  }, [features, lastEditSource])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (!selectedId) {
      view.dispatch({ effects: setHighlightRange.of(null) })
      return
    }
    const idx = features.features.findIndex((f) => f.id === selectedId)
    if (idx < 0) {
      view.dispatch({ effects: setHighlightRange.of(null) })
      return
    }
    const ranges = computeFeatureRanges(view.state.doc.toString())
    const range = ranges[idx]
    if (!range) {
      view.dispatch({ effects: setHighlightRange.of(null) })
      return
    }
    view.dispatch({
      effects: [
        setHighlightRange.of({ fromLine: range.fromLine, toLine: range.toLine }),
        EditorView.scrollIntoView(range.from, { y: 'center' }),
      ],
    })
  }, [selectedId, features])

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.copyBtn}
        onClick={handleCopy}
        disabled={features.features.length === 0}
        title="Copy GeoJSON"
        aria-label="Copy GeoJSON"
      >
        <CopyIcon />
      </button>
      <div ref={hostRef} className={styles.host} />
      <div className={styles.statusBar} data-state={status.state}>
        <span className={styles.dot} />
        <span>{status.message}</span>
      </div>
    </div>
  )
}
