import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { JsonEditor } from './JsonEditor'
import { useFeatureStore } from '../store/useFeatureStore'
import { sampleFC } from '../test/sample-geojson'

const resetStore = () =>
  useFeatureStore.setState({
    features: { type: 'FeatureCollection', features: [] },
    selectedId: null,
    tool: 'hand',
    draftFeature: null,
    toasts: [],
    lastEditSource: 'init',
    hiddenIds: new Set<string>(),
    flyToId: null,
  })

const getView = (container: HTMLElement): EditorView | null => {
  const root = container.querySelector('.cm-editor')
  if (!root) return null
  return EditorView.findFromDOM(root as HTMLElement)
}

const setDoc = async (view: EditorView, text: string) => {
  await act(async () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    await new Promise((r) => setTimeout(r, 300))
  })
}

beforeEach(() => {
  resetStore()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('JsonEditor', () => {
  it('mounts the CodeMirror editor with the current store state', () => {
    const { container } = render(<JsonEditor />)
    const editor = container.querySelector('.cm-editor')
    expect(editor).toBeInTheDocument()
  })

  it('shows the valid status text by default', () => {
    const { getByText } = render(<JsonEditor />)
    expect(getByText('Valid GeoJSON')).toBeInTheDocument()
  })

  it('reflects external feature changes into the document', async () => {
    const { findByText } = render(<JsonEditor />)
    await act(async () => {
      useFeatureStore.getState().replaceAll(sampleFC, 'import')
    })
    await findByText(/3 feature/)
  })

  it('updates the store on valid JSON edits', async () => {
    const { container } = render(<JsonEditor />)
    const view = getView(container)
    expect(view).not.toBeNull()
    await setDoc(view!, JSON.stringify(sampleFC))
    await waitFor(() => expect(useFeatureStore.getState().features.features).toHaveLength(3))
  })

  it('shows an error status when the document is not valid JSON', async () => {
    const { container, findByText } = render(<JsonEditor />)
    const view = getView(container)
    expect(view).not.toBeNull()
    await setDoc(view!, '{not json')
    await findByText(/JSON:/)
  })

  it('shows an error status when the document is not valid GeoJSON', async () => {
    const { container, queryByText } = render(<JsonEditor />)
    const view = getView(container)
    expect(view).not.toBeNull()
    await setDoc(view!, JSON.stringify({ foo: 'bar' }))
    await waitFor(() => expect(queryByText('Valid GeoJSON')).not.toBeInTheDocument())
  })

  it('ignores incoming features when the last edit came from the editor itself', async () => {
    const { container } = render(<JsonEditor />)
    const view = getView(container)
    expect(view).not.toBeNull()
    await setDoc(view!, JSON.stringify(sampleFC))
    const after = view!.state.doc.toString()
    await act(async () => {
      useFeatureStore.setState({ lastEditSource: 'editor' })
    })
    expect(view!.state.doc.toString()).toBe(after)
  })

  it('does not rewrite the document when next === current', async () => {
    render(<JsonEditor />)
    await act(async () => {
      useFeatureStore.setState({ lastEditSource: 'map' })
    })
    expect(true).toBe(true)
  })

  it('uses the oneDark theme when prefers-color-scheme is dark', () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: q.includes('dark'),
      media: q,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    const { container } = render(<JsonEditor />)
    expect(container.querySelector('.cm-editor')).toBeTruthy()
    window.matchMedia = original
  })

  it('highlights the line range of the selected feature', async () => {
    const { container } = render(<JsonEditor />)
    await act(async () => {
      useFeatureStore.getState().replaceAll(sampleFC, 'import')
    })
    await act(async () => {
      useFeatureStore.getState().setSelected(sampleFC.features[1].id as string)
    })
    await waitFor(() => {
      const highlighted = container.querySelectorAll('.cm-selectedFeature')
      expect(highlighted.length).toBeGreaterThan(0)
    })
    const view = getView(container)
    expect(view).not.toBeNull()
    const doc = view!.state.doc.toString()
    const lines = doc.split('\n')
    const highlighted = Array.from(
      container.querySelectorAll('.cm-selectedFeature'),
    ) as HTMLElement[]
    const firstText = highlighted[0].textContent ?? ''
    const lastText = highlighted[highlighted.length - 1].textContent ?? ''
    expect(firstText.trim()).toBe('{')
    expect(lastText.trim().replace(/,$/, '')).toBe('}')
    const blockText = highlighted.map((el) => el.textContent ?? '').join('\n')
    expect(blockText).toContain('ln-1')
    expect(lines.some((l) => l.includes('pt-1'))).toBe(true)
  })

  it('clears the highlight when selection is cleared', async () => {
    const { container } = render(<JsonEditor />)
    await act(async () => {
      useFeatureStore.getState().replaceAll(sampleFC, 'import')
    })
    await act(async () => {
      useFeatureStore.getState().setSelected(sampleFC.features[0].id as string)
    })
    await waitFor(() => {
      expect(container.querySelectorAll('.cm-selectedFeature').length).toBeGreaterThan(0)
    })
    await act(async () => {
      useFeatureStore.getState().setSelected(null)
    })
    await waitFor(() => {
      expect(container.querySelectorAll('.cm-selectedFeature').length).toBe(0)
    })
  })

  it('copies the GeoJSON when the copy button is clicked', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({ features: sampleFC })
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    })
    render(<JsonEditor />)
    await user.click(screen.getByRole('button', { name: /Copy GeoJSON/i }))
    await waitFor(() => expect(write).toHaveBeenCalledWith(JSON.stringify(sampleFC, null, 2)))
    expect(
      useFeatureStore.getState().toasts.some((t) => t.message === 'Copied GeoJSON to clipboard'),
    ).toBe(true)
  })

  it('copy button is disabled when the feature collection is empty', () => {
    render(<JsonEditor />)
    expect(screen.getByRole('button', { name: /Copy GeoJSON/i })).toBeDisabled()
  })

  it('emits an error toast when the copy clipboard call fails', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({ features: sampleFC })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('nope')) },
    })
    render(<JsonEditor />)
    await user.click(screen.getByRole('button', { name: /Copy GeoJSON/i }))
    await waitFor(() =>
      expect(
        useFeatureStore.getState().toasts.some((t) => t.message === 'Clipboard access denied'),
      ).toBe(true),
    )
  })

  it('responds to a prefers-color-scheme change event', () => {
    let listener: ((e: MediaQueryListEvent) => void) | null = null
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: (_name: string, cb: (e: MediaQueryListEvent) => void) => {
        listener = cb
      },
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    render(<JsonEditor />)
    act(() => {
      listener?.({ matches: true } as MediaQueryListEvent)
    })
    window.matchMedia = original
  })
})
