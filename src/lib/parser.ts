import type { Mark, MarkKind, ParsedText } from './model'

const delimiters: Record<string, { close: string; kind: MarkKind }> = {
  '*': { close: '*', kind: 'bold' }, '_': { close: '_', kind: 'underline' },
  '=': { close: '=', kind: 'highlight' }, '<': { close: '>', kind: 'soft' },
  '>': { close: '>', kind: 'strong' }, '/': { close: '/', kind: 'rise' },
  '\\': { close: '\\', kind: 'fall' },
}

export function parse(source: string): ParsedText {
  let text = ''
  const sourceMap: number[] = []
  const marks: Mark[] = []
  const breaks: number[] = []
  const stack: { close: string; kind: MarkKind; start: number; source: number }[] = []
  let cursor = 0
  const append = (value: string, offset: number) => {
    text += value
    for (let index = 0; index < value.length; index++) sourceMap.push(offset + index)
  }
  while (cursor < source.length) {
    const symbol = source[cursor]
    if (symbol === '`') {
      let closing = cursor + 1
      while (closing < source.length) {
        if (source[closing] === '`') {
          if (source[closing + 1] === '`') { closing += 2; continue }
          break
        }
        closing++
      }
      if (closing < source.length) {
        for (let offset = cursor + 1; offset < closing; offset++) {
          append(source[offset], offset)
          if (source[offset] === '`' && source[offset + 1] === '`') offset++
        }
        cursor = closing + 1
        continue
      }
    }
    const active = stack.at(-1)
    if (active?.close === symbol) {
      stack.pop()
      if (text.length > active.start) marks.push({ id: `syntax-${active.source}`, start: active.start, end: text.length, kind: active.kind, value: '' })
      cursor++
      continue
    }
    const delimiter = delimiters[symbol]
    if (delimiter && source.indexOf(delimiter.close, cursor + 1) > cursor + 1) {
      stack.push({ ...delimiter, start: text.length, source: cursor })
      cursor++
      continue
    }
    if (symbol === '-' && /\p{L}/u.test(source[cursor - 1] || '') && /\p{L}/u.test(source[cursor + 1] || '')) {
      breaks.push(text.length)
      cursor++
      continue
    }
    if (symbol === '\r') {
      if (source[cursor + 1] !== '\n') append('\n', cursor)
    } else append(symbol, cursor)
    cursor++
  }
  for (const opening of stack.toReversed()) {
    const mapped = sourceMap.findIndex(offset => offset > opening.source)
    const position = mapped === -1 ? text.length : mapped
    text = text.slice(0, position) + source[opening.source] + text.slice(position)
    sourceMap.splice(position, 0, opening.source)
    for (const mark of marks) {
      if (position <= mark.start) mark.start++
      if (position < mark.end) mark.end++
    }
    for (let index = 0; index < breaks.length; index++) if (breaks[index] >= position) breaks[index]++
  }
  return { text, marks, sourceMap, breaks }
}

export function literalSource(text: string): string {
  return `\`${text.replace(/\r\n?/g, '\n').replaceAll('`', '``')}\``
}