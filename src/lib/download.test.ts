import { describe, expect, it, vi } from 'vitest'
import { downloadJson } from './download'

describe('downloadJson', () => {
  it('creates a blob URL, triggers a download click, and revokes the URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const clickSpy = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild')

    const originalCreate = document.createElement.bind(document)
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag)
      if (tag === 'a') {
        ;(el as HTMLAnchorElement).click = clickSpy
      }
      return el
    })

    downloadJson('out.geojson', { foo: 'bar' })

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blobArg = createObjectURL.mock.calls[0][0] as Blob
    expect(blobArg).toBeInstanceOf(Blob)
    expect(blobArg.type).toBe('application/geo+json')

    expect(createSpy).toHaveBeenCalledWith('a')
    expect(appendChild).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })
})
