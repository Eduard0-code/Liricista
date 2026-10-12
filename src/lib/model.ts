import { z } from 'zod'

export const markKinds = ['bold', 'underline', 'highlight', 'color', 'soft', 'strong', 'rise', 'fall', 'melisma', 'note'] as const
export type MarkKind = typeof markKinds[number]
const rangeSchema = z.object({ start: z.number().int().nonnegative(), end: z.number().int().positive() }).refine(range => range.end > range.start)
export const markSchema = rangeSchema.and(z.object({
  id: z.string(), kind: z.enum(markKinds), value: z.string().max(2000).default(''),
}))
export type Mark = z.infer<typeof markSchema>
export interface ParsedText { text: string; sourceMap: number[]; marks: Mark[]; breaks: number[] }
export const projectSchema = z.object({
  format: z.literal('liricista'), version: z.literal(1), title: z.string().max(200),
  source: z.string().max(200000), marks: z.array(markSchema).max(10000),
  pending: z.array(z.object({ mark: markSchema, quote: z.string(), reason: z.string() })).max(10000),
  divisions: z.array(rangeSchema.and(z.object({ word: z.string(), parts: z.array(z.string().min(1)).min(1) }))).max(10000),
  alignment: z.enum(['left', 'center']), separated: z.boolean(),
}).strict()
export type Project = z.infer<typeof projectSchema>
export const createProject = (source = '', title = 'Sem título'): Project => ({
  format: 'liricista', version: 1, title, source, marks: [], pending: [], divisions: [], alignment: 'left', separated: false,
})
export const cloneProject = (project: Project): Project => JSON.parse(JSON.stringify(project))
export function graphemes(text: string) {
  return [...new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(text)]
    .map(item => ({ text: item.segment, start: item.index, end: item.index + item.segment.length }))
}