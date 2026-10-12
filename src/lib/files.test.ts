import { describe, expect, it } from 'vitest'
import { createProject } from './model'
import { exportDocx, importFile, projectJson, validateProject } from './files'
import { parse } from './parser'
import { units, validParts } from './syllables'

describe('sílabas', () => {
  it('prioriza separações manuais e permite corrigir sugestões', () => {
    const parsed = parse('a-mor palavra')
    expect(units(parsed, [], 'syllable').slice(0, 2).map(unit => unit.text)).toEqual(['a', 'mor'])
    const divided = units(parsed, [{ start: 5, end: 12, word: 'palavra', parts: ['pa', 'la', 'vra'] }], 'syllable')
    expect(divided.slice(-3).map(unit => unit.text)).toEqual(['pa', 'la', 'vra'])
    expect(validParts('amor', 'a-mor')).toEqual(['a', 'mor'])
    expect(validParts('amor', 'a-mar')).toBeNull()
    expect(validParts('a\u0301', 'a-\u0301')).toBeNull()
  })
})

describe('arquivos', () => {
  it('recupera integralmente o projeto próprio', async () => {
    const project = { ...createProject('voz'), marks: [{ id: '1', start: 0, end: 3, kind: 'note' as const, value: 'respirar' }], divisions: [{ start: 0, end: 3, word: 'voz', parts: ['voz'] }] }
    expect(await importFile(new File([projectJson(project)], 'voz.liricista.json'))).toEqual(project)
  })
  it('importa TXT sem interpretar símbolos', async () => {
    const result = await importFile(new File(['*voz*\r\nco-autor `tom`'], 'voz.txt'))
    expect(parse(result.source).text).toBe('*voz*\nco-autor `tom`')
  })
  it('gera DOCX e importa novamente seu texto', async () => {
    const project = { ...createProject('Primeiro verso\n\nSegundo verso', 'Canção'), alignment: 'center' as const }
    const blob = await exportDocx(project)
    const result = await importFile(new File([blob], 'cancao.docx'))
    expect(parse(result.source).text).toContain('Primeiro verso\n\n')
    expect(parse(result.source).text).toContain('Segundo verso')
  })
  it('rejeita estruturas, posições e divisões inválidas', () => {
    expect(() => validateProject({ format: 'liricista', version: 99 })).toThrow()
    expect(() => validateProject({ ...createProject('voz'), marks: [{ id: '1', start: 0, end: 9, kind: 'bold', value: '' }] })).toThrow()
    expect(() => validateProject({ ...createProject('voz'), divisions: [{ start: 0, end: 3, word: 'voz', parts: ['vaz'] }] })).toThrow()
  })
  it('informa que ODT está fora desta versão', async () => {
    await expect(importFile(new File([''], 'voz.odt'))).rejects.toThrow('ODT/ODF')
  })
})