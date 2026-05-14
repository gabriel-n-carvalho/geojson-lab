import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useFeatureStore } from '../store/useFeatureStore'

// Stub out JsonEditor — CodeMirror is exercised in its own test.
vi.mock('./JsonEditor', () => ({
  JsonEditor: () => <div data-testid="json-editor">json</div>,
}))

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

beforeEach(() => resetStore())

describe('Sidebar', () => {
  it('renders the JSON editor', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('json-editor')).toBeInTheDocument()
  })
})
