import { diffChars } from 'diff'
import { cloneProject, type Project } from './model'
import { parse } from './parser'

function occurrences(text: string, quote: string) {
  if (!quote) return 0
  let total = 0
  let offset = text.indexOf(quote)
  while (offset !== -1) { total++; offset = text.indexOf(quote, offset + 1) }
  return total
}

export function rewrite(project: Project, source: string): Project {
  const next = cloneProject(project)
  const previousText = parse(project.source).text
  const nextText = parse(source).text
  next.source = source
  if (previousText === nextText) return next
  const mapping = new Map<number, number>()
  let previousOffset = 0
  let nextOffset = 0
  for (const change of diffChars(previousText, nextText)) {
    if (!change.added && !change.removed) {
      for (let index = 0; index < change.value.length; index++) mapping.set(previousOffset + index, nextOffset + index)
    }
    if (!change.added) previousOffset += change.value.length
    if (!change.removed) nextOffset += change.value.length
  }
  const relocate = (start: number, end: number) => {
    const quote = previousText.slice(start, end)
    if (occurrences(previousText, quote) !== 1 || occurrences(nextText, quote) !== 1) return null
    const mappedStart = mapping.get(start)
    if (mappedStart === undefined) return null
    for (let offset = start; offset < end; offset++) {
      if (mapping.get(offset) !== mappedStart + offset - start) return null
    }
    return { start: mappedStart, end: mappedStart + end - start }
  }
  next.marks = project.marks.flatMap(mark => {
    const range = relocate(mark.start, mark.end)
    if (range) return [{ ...mark, ...range }]
    next.pending.push({ mark, quote: previousText.slice(mark.start, mark.end), reason: 'Trecho alterado, removido ou repetido.' })
    return []
  })
  next.divisions = project.divisions.flatMap(division => {
    const range = relocate(division.start, division.end)
    return range ? [{ ...division, ...range }] : []
  })
  return next
}