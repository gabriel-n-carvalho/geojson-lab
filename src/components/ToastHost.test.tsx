import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastHost } from './ToastHost'
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

beforeEach(() => resetStore())

describe('ToastHost', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastHost />)
    expect(container.querySelectorAll('[data-kind]').length).toBe(0)
  })

  it('renders every toast in the store', () => {
    useFeatureStore.setState({
      toasts: [
        { id: '1', kind: 'info', message: 'hello' },
        { id: '2', kind: 'error', message: 'broken' },
      ],
    })
    render(<ToastHost />)
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByText('broken')).toBeInTheDocument()
  })

  it('clicking the dismiss button removes the toast', async () => {
    const user = userEvent.setup()
    useFeatureStore.setState({
      toasts: [{ id: '1', kind: 'info', message: 'hello' }],
    })
    render(<ToastHost />)
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(useFeatureStore.getState().toasts).toHaveLength(0)
  })
})
