import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUploadWithProgress } from '~/composables/useUploadWithProgress'

type UploadScenario = 'success' | 'error'

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = []
  static scenario: UploadScenario = 'success'

  upload: { onprogress: ((event: any) => void) | null } = { onprogress: null }
  status = 0
  responseText = ''
  headers: Record<string, string> = {}
  method = ''
  url = ''

  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    MockXMLHttpRequest.instances.push(this)
  }

  open(method: string, url: string) {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }

  send(_body: FormData) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 })

    if (MockXMLHttpRequest.scenario === 'success') {
      this.status = 200
      this.responseText = JSON.stringify({ url: '/uploads/test.png' })
      this.onload?.()
      return
    }

    this.status = 400
    this.responseText = JSON.stringify({ error: 'Invalid file' })
    this.onload?.()
  }
}

describe('useUploadWithProgress', () => {
  const originalXmlHttpRequest = globalThis.XMLHttpRequest

  beforeEach(() => {
    MockXMLHttpRequest.instances = []
    MockXMLHttpRequest.scenario = 'success'
    globalThis.XMLHttpRequest = MockXMLHttpRequest as any
  })

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXmlHttpRequest
  })

  it('reports upload progress and resolves payload', async () => {
    const progressUpdates: number[] = []
    const { uploadWithProgress } = useUploadWithProgress()

    const payload = await uploadWithProgress<{ url: string }>({
      url: '/api/upload',
      file: new File(['abc'], 'test.png', { type: 'image/png' }),
      token: 'token-123',
      onProgress: (percent) => progressUpdates.push(percent)
    })

    expect(payload.url).toBe('/uploads/test.png')
    expect(progressUpdates).toContain(50)
    expect(progressUpdates.at(-1)).toBe(100)
    expect(MockXMLHttpRequest.instances[0]?.headers.Authorization).toBe('Bearer token-123')
  })

  it('surfaces API errors from upload response', async () => {
    MockXMLHttpRequest.scenario = 'error'
    const { uploadWithProgress } = useUploadWithProgress()

    await expect(
      uploadWithProgress({
        url: '/api/upload',
        file: new File(['abc'], 'bad.png', { type: 'image/png' })
      })
    ).rejects.toThrow('Invalid file')
  })
})
