import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Feature } from 'geojson'
import { LayersPanel } from './LayersPanel'
import { useFeatureStore } from '../store/useFeatureStore'

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

const seed = (features: Feature[]) =>
  useFeatureStore.setState({ features: { type: 'FeatureCollection', features } })

beforeEach(() => resetStore())

describe('LayersPanel', () => {
  it('shows the empty state when there are no features', () => {
    render(<LayersPanel />)
    expect(screen.getByText(/No layers yet/)).toBeInTheDocument()
  })

  it('loads sample data when the empty CTA is clicked', () => {
    render(<LayersPanel />)
    fireEvent.click(screen.getByText(/Load sample data/))
    expect(useFeatureStore.getState().features.features.length).toBeGreaterThan(0)
  })

  it('renders one row per feature with a default geometry label', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: null,
        geometry: { type: 'Point', coordinates: [1, 2] },
      },
      {
        type: 'Feature',
        id: 'b',
        properties: { name: 'Plot' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
    ])
    render(<LayersPanel />)
    expect(screen.getByText('Point')).toBeInTheDocument()
    expect(screen.getByText('Plot')).toBeInTheDocument()
  })

  it('uses Name/title/label fallbacks for the row label', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: { Name: 'A' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
      {
        type: 'Feature',
        id: 'b',
        properties: { title: 'B' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
      {
        type: 'Feature',
        id: 'c',
        properties: { label: 'C' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('skips features that have no id', () => {
    seed([
      {
        type: 'Feature',
        properties: { name: 'No id' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    expect(screen.queryByText('No id')).not.toBeInTheDocument()
  })

  it('clicking an unselected row calls flyTo with its id and selects it', async () => {
    const user = userEvent.setup()
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    await user.click(screen.getByRole('listitem'))
    expect(useFeatureStore.getState().flyToId).toBe('a')
    expect(useFeatureStore.getState().selectedId).toBe('a')
  })

  it('clicking the already-selected row deselects without flying', async () => {
    const user = userEvent.setup()
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    useFeatureStore.setState({ selectedId: 'a' })
    render(<LayersPanel />)
    await user.click(screen.getByRole('listitem'))
    expect(useFeatureStore.getState().selectedId).toBeNull()
    expect(useFeatureStore.getState().flyToId).toBeNull()
  })

  it('pressing Enter on a row triggers flyTo', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    fireEvent.keyDown(screen.getByRole('listitem'), { key: 'Enter' })
    expect(useFeatureStore.getState().flyToId).toBe('a')
  })

  it('pressing Enter on the already-selected row deselects', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    useFeatureStore.setState({ selectedId: 'a' })
    render(<LayersPanel />)
    fireEvent.keyDown(screen.getByRole('listitem'), { key: 'Enter' })
    expect(useFeatureStore.getState().selectedId).toBeNull()
    expect(useFeatureStore.getState().flyToId).toBeNull()
  })

  it('pressing Space on a row triggers flyTo', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    fireEvent.keyDown(screen.getByRole('listitem'), { key: ' ' })
    expect(useFeatureStore.getState().flyToId).toBe('a')
  })

  it('pressing Space on the already-selected row deselects', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    useFeatureStore.setState({ selectedId: 'a' })
    render(<LayersPanel />)
    fireEvent.keyDown(screen.getByRole('listitem'), { key: ' ' })
    expect(useFeatureStore.getState().selectedId).toBeNull()
    expect(useFeatureStore.getState().flyToId).toBeNull()
  })

  it('pressing other keys does nothing', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    fireEvent.keyDown(screen.getByRole('listitem'), { key: 'x' })
    expect(useFeatureStore.getState().flyToId).toBeNull()
  })

  it('clicking the visibility toggle calls toggleHidden but not flyTo', async () => {
    const user = userEvent.setup()
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: { name: 'A' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    render(<LayersPanel />)
    await user.click(screen.getByRole('button', { name: /Hide A/ }))
    expect(useFeatureStore.getState().hiddenIds.has('a')).toBe(true)
    expect(useFeatureStore.getState().flyToId).toBeNull()
  })

  it('clicking the delete button removes the feature and does not fly to it', async () => {
    const user = userEvent.setup()
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: { name: 'A' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
      {
        type: 'Feature',
        id: 'b',
        properties: { name: 'B' },
        geometry: { type: 'Point', coordinates: [1, 1] },
      },
    ])
    render(<LayersPanel />)
    await user.click(screen.getByRole('button', { name: /Delete A/ }))
    const remaining = useFeatureStore.getState().features.features.map((f) => f.id)
    expect(remaining).toEqual(['b'])
    expect(useFeatureStore.getState().flyToId).toBeNull()
  })

  it('deleting the selected feature clears selectedId', async () => {
    const user = userEvent.setup()
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: { name: 'A' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    useFeatureStore.setState({ selectedId: 'a' })
    render(<LayersPanel />)
    await user.click(screen.getByRole('button', { name: /Delete A/ }))
    expect(useFeatureStore.getState().selectedId).toBeNull()
  })

  it('shows a "show" button label after a feature is hidden', () => {
    seed([
      {
        type: 'Feature',
        id: 'a',
        properties: { name: 'A' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
    ])
    useFeatureStore.setState({ hiddenIds: new Set(['a']) })
    render(<LayersPanel />)
    expect(screen.getByRole('button', { name: /Show A/ })).toBeInTheDocument()
  })

  it('renders subtitle for every geometry type', () => {
    seed([
      {
        type: 'Feature',
        id: 'pt',
        properties: {},
        geometry: { type: 'Point', coordinates: [-122, 37] },
      },
      {
        type: 'Feature',
        id: 'ln',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'pg',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'pgEmpty',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [] },
      },
      {
        type: 'Feature',
        id: 'mpt',
        properties: {},
        geometry: { type: 'MultiPoint', coordinates: [[0, 0]] },
      },
      {
        type: 'Feature',
        id: 'mln',
        properties: {},
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'mpg',
        properties: {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [0, 1],
                [0, 0],
              ],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'gc',
        properties: {},
        geometry: { type: 'GeometryCollection', geometries: [] },
      },
    ])
    render(<LayersPanel />)
    expect(screen.getByText(/^pt · 37/)).toBeInTheDocument()
    expect(screen.getByText(/^ln · [\d.]+ (m|km)$/)).toBeInTheDocument()
    expect(screen.getByText(/^pg · [\d.]+ (m²|ha|km²)$/)).toBeInTheDocument()
    expect(screen.getByText('pgEmpty · 0 m²')).toBeInTheDocument()
    expect(screen.getByText('mpt · 1 points')).toBeInTheDocument()
    expect(screen.getByText(/^mln · [\d.]+ (m|km)$/)).toBeInTheDocument()
    expect(screen.getByText(/^mpg · [\d.]+ (m²|ha|km²)$/)).toBeInTheDocument()
    expect(screen.getByText('gc')).toBeInTheDocument()
  })
})
