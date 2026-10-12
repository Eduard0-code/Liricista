import { createProject, graphemes, projectSchema, type Mark, type Project } from './model'
import { literalSource, parse } from './parser'

export const labels: Record<Mark['kind'], string> = {
  bold: 'Ênfase', underline: 'Sublinhado', highlight: 'Realce', color: 'Cor',
  soft: 'Suave', strong: 'Forte', rise: 'Subida', fall: 'Descida', melisma: 'Melisma', note: 'Nota',
}

export function validateProject(value: unknown): Project {
  const project = projectSchema.parse(value)
  const text = parse(project.source).text
  const boundaries = new Set([0, ...graphemes(text).map(item => item.end)])
  const validRange = (start: number, end: number) => end <= text.length && boundaries.has(start) && boundaries.has(end)
  if (project.marks.some(mark => !validRange(mark.start, mark.end))) throw new Error('Marcação fora do texto.')
  if (project.marks.some(mark => mark.kind === 'color' && !/^#[\da-f]{6}$/i.test(mark.value))) throw new Error('Cor inválida.')
  for (const division of project.divisions) {
    if (!validRange(division.start, division.end) || text.slice(division.start, division.end) !== division.word || division.parts.join('') !== division.word) {
      throw new Error('Divisão silábica inválida.')
    }
    let offset = division.start
    for (const part of division.parts) { offset += part.length; if (!boundaries.has(offset)) throw new Error('Divisão dentro de uma letra.') }
  }
  return project
}

export function projectJson(project: Project): string { return JSON.stringify(validateProject(project), null, 2) }

export async function importFile(file: File): Promise<Project> {
  if (file.size > 10 * 1024 * 1024) throw new Error('O limite de importação é 10 MB.')
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  if (extension === 'json') return validateProject(JSON.parse(await file.text()))
  let text: string
  if (extension === 'txt') text = await file.text()
  else if (extension === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser.js')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    text = result.value
  } else throw new Error('Formato não suportado. Use TXT, DOCX ou projeto Liricista (.json). ODT/ODF ainda não está disponível.')
  if (text.length > 200000) throw new Error('O limite é 200 mil caracteres.')
  return validateProject(createProject(literalSource(text.replace(/^\uFEFF/, '')), file.name.replace(/\.[^.]+$/, '').slice(0, 200)))
}

export async function exportDocx(project: Project): Promise<Blob> {
  const { Document, Paragraph, TextRun, Packer, AlignmentType, HeadingLevel } = await import('docx')
  const parsed = parse(project.source)
  const marks = [...parsed.marks, ...project.marks]
  let offset = 0
  const paragraphs = parsed.text.split('\n').map(line => {
    const end = offset + line.length
    const boundaries = [...new Set([offset, end, ...marks.flatMap(mark => [mark.start, mark.end]).filter(position => position > offset && position < end)])].sort((first, second) => first - second)
    const children = boundaries.slice(0, -1).map((start, index) => {
      const active = marks.filter(mark => mark.start <= start && mark.end > start)
      const color = active.findLast(mark => mark.kind === 'color')?.value
      return new TextRun({
        text: parsed.text.slice(start, boundaries[index + 1]),
        bold: active.some(mark => ['bold', 'strong'].includes(mark.kind)),
        italics: active.some(mark => mark.kind === 'soft'),
        underline: active.some(mark => ['underline', 'melisma'].includes(mark.kind)) ? {} : undefined,
        color: color?.replace('#', ''),
        shading: active.some(mark => mark.kind === 'highlight') ? { fill: 'FFF1A8' } : undefined,
      })
    })
    offset = end + 1
    return new Paragraph({ children, alignment: project.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 100 } })
  })
  const notes = marks.filter(mark => ['soft', 'strong', 'rise', 'fall', 'melisma', 'note'].includes(mark.kind) || mark.value && mark.kind !== 'color')
  if (notes.length || project.pending.length) {
    paragraphs.push(new Paragraph({ text: 'Anotações', heading: HeadingLevel.HEADING_2 }))
    for (const mark of notes) {
      const verse = parsed.text.slice(0, mark.start).split('\n').length
      paragraphs.push(new Paragraph({ text: `Verso ${verse}, caracteres ${mark.start + 1}-${mark.end}: "${parsed.text.slice(mark.start, mark.end)}" | ${labels[mark.kind]}${mark.value ? ': ' + mark.value : ''}` }))
    }
    for (const pending of project.pending) paragraphs.push(new Paragraph({ text: `Pendente: "${pending.quote}" | ${labels[pending.mark.kind]}: ${pending.mark.value}. ${pending.reason}` }))
  }
  return Packer.toBlob(new Document({ sections: [{ children: [new Paragraph({ text: project.title || 'Sem título', heading: HeadingLevel.TITLE }), ...paragraphs] }] }))
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export const safeName = (title: string) => title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 100) || 'liricista'