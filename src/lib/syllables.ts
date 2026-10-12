import { hyphenateSync } from 'hyphen/pt'
import { graphemes, type ParsedText, type Project } from './model'

export interface Unit { text: string; start: number; end: number; word?: { text: string; start: number; end: number } }

export function validParts(word: string, value: string): string[] | null {
  const parts = value.trim().split('-')
  if (parts.some(part => !part) || parts.join('') !== word) return null
  const boundaries = new Set(graphemes(word).map(item => item.end))
  let position = 0
  for (const part of parts) { position += part.length; if (!boundaries.has(position)) return null }
  return parts
}

export function units(parsed: ParsedText, divisions: Project['divisions'], mode: 'letter' | 'syllable'): Unit[] {
  const result: Unit[] = []
  for (const match of parsed.text.matchAll(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu)) {
    const text = match[0]
    const start = match.index
    if (!/^\p{L}/u.test(text)) {
      result.push(...graphemes(text).map(item => ({ ...item, start: start + item.start, end: start + item.end })))
      continue
    }
    const word = { text, start, end: start + text.length }
    if (mode === 'letter') {
      result.push(...graphemes(text).map(item => ({ ...item, start: start + item.start, end: start + item.end, word })))
      continue
    }
    const override = divisions.find(item => item.start === start && item.end === word.end && item.word === text)
    const manual = parsed.breaks.filter(offset => offset > start && offset < word.end)
    const boundaries = [start, ...manual, word.end]
    const parts = override?.parts || (manual.length
      ? boundaries.slice(0, -1).map((offset, index) => parsed.text.slice(offset, boundaries[index + 1]))
      : hyphenateSync(text, { hyphenChar: '\u00ad' }).split('\u00ad'))
    let offset = start
    for (const part of parts) {
      result.push({ text: part, start: offset, end: offset + part.length, word })
      offset += part.length
    }
  }
  return result
}