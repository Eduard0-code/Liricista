import { beforeEach, expect, it, vi } from 'vitest'
import { get, set } from 'idb-keyval'
import { createProject } from './model'
import { restore, save } from './storage'

vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
it('valida o documento restaurado e não ignora corrupção', async () => {
  vi.mocked(get).mockResolvedValueOnce(createProject('voz'))
  expect((await restore())?.source).toBe('voz')
  vi.mocked(get).mockResolvedValueOnce({ version: 99 })
  await expect(restore()).rejects.toThrow()
})
it('relata falhas, permite tentar novamente e serializa snapshots', async () => {
  vi.mocked(set).mockRejectedValueOnce(new Error('Sem espaço')).mockResolvedValue(undefined)
  const project = createProject('primeiro')
  await expect(save(project)).rejects.toThrow('Sem espaço')
  const operation = save(project)
  project.source = 'segundo'
  await operation
  expect(vi.mocked(set).mock.calls[1][1]).toMatchObject({ source: 'primeiro' })
})