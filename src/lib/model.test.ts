import { describe, expect, it } from 'vitest'
import { createProject, graphemes } from './model'
import { literalSource, parse } from './parser'
import { rewrite } from './reconcile'

describe('parser', () => {
  it('separa texto, símbolos, estilos e posições de origem', () => {
    const result = parse('*ação*\n\n<leve> >forte> /alto/ \\baixo\\ _linha_ =luz=')
    expect(result.text).toBe('ação\n\nleve forte alto baixo linha luz')
    expect(result.marks.map(mark => mark.kind)).toEqual(['bold', 'soft', 'strong', 'rise', 'fall', 'underline', 'highlight'])
    expect(result.sourceMap.slice(0, 4)).toEqual([1, 2, 3, 4])
  })
  it('suporta estilos aninhados, símbolos literais e hífens manuais', () => {
    const result = parse('*_voz_* a-mor `*literal* co-autor`')
    expect(result.text).toBe('voz amor *literal* co-autor')
    expect(result.breaks).toEqual([5])
    expect(result.marks).toHaveLength(2)
    expect(parse('sem *par').text).toBe('sem *par')
  })
  it('preserva texto importado como literal e normaliza CRLF', () => {
    expect(parse(literalSource('*voz*\r\nco-autor /fala/ `crase`')).text).toBe('*voz*\nco-autor /fala/ `crase`')
    expect(parse('a\r\nb\rc').text).toBe('a\nb\nc')
  })
  it('não separa acentos combinantes ou emojis em letras', () => {
    expect(graphemes('a\u0301🎵')).toHaveLength(2)
  })
  it('não perde delimitadores não fechados em pares cruzados', () => {
    const result = parse('*a _b* c_')
    expect(result.text).toBe('*a b* c')
    expect(result.sourceMap).toEqual([0, 1, 2, 4, 5, 6, 7])
    expect(result.marks[0]).toMatchObject({ kind: 'underline', start: 3, end: 7 })
  })
})

describe('preservação', () => {
  const original = () => ({ ...createProject('O vento canta'), marks: [{ id: '1', start: 8, end: 13, kind: 'melisma' as const, value: 'sustentar' }] })
  it('preserva uma marca após inserção dentro do mesmo verso', () => {
    expect(rewrite(original(), 'O vento ainda canta').marks[0]).toMatchObject({ start: 14, end: 19 })
  })
  it('preserva ao editar outro trecho e ao alterar apenas sintaxe', () => {
    expect(rewrite(original(), 'A brisa canta').marks[0]).toMatchObject({ start: 8, end: 13 })
    expect(rewrite(original(), 'O *vento* canta').marks).toEqual(original().marks)
  })
  it.each(['O vento cantou', 'O vento', 'O vento canta canta'])('mantém alteração ambígua como pendência: %s', source => {
    const result = rewrite(original(), source)
    expect(result.marks).toEqual([])
    expect(result.pending[0]).toMatchObject({ quote: 'canta', mark: { value: 'sustentar' } })
  })
  it('preserva offsets UTF-16 após emoji e acento', () => {
    const result = rewrite(original(), '🎵 O vento canta')
    expect(result.marks[0]).toMatchObject({ start: 11, end: 16 })
  })
  it('não transfere silenciosamente marcações em versos repetidos', () => {
    const project = { ...createProject('voz\nvoz'), marks: [{ id: '1', start: 0, end: 3, kind: 'bold' as const, value: '' }] }
    expect(rewrite(project, 'voz\nvoz!').pending).toHaveLength(1)
  })
})