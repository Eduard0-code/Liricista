<script lang="ts">
  import { graphemes, type Mark, type ParsedText, type Project } from './model'
  import { labels } from './files'
  import { units, type Unit } from './syllables'
  let { parsed, project, mode, selection, onselect }: {
    parsed: ParsedText; project: Project; mode: 'letter' | 'syllable';
    selection: { start: number; end: number } | null;
    onselect: (unit: Unit, extend: boolean) => void;
  } = $props()
  const allMarks = $derived([...parsed.marks, ...project.marks])
  const rows = $derived.by(() => {
    const result: Unit[][][] = [[]]
    for (const unit of units(parsed, project.divisions, mode)) {
      if (unit.text === '\n') { result.push([]); continue }
      const row = result.at(-1)!
      const last = row.at(-1)
      if (last && unit.word && last[0].word?.start === unit.word.start) last.push(unit)
      else row.push([unit])
    }
    return result
  })
  const activeMarks = (start: number, end: number): Mark[] => allMarks.filter(mark => mark.start < end && mark.end > start)
  const glyphStyle = (marks: Mark[]) => [
    marks.findLast(mark => mark.kind === 'color') ? `color:${marks.findLast(mark => mark.kind === 'color')!.value}` : '',
    marks.some(mark => ['bold', 'strong'].includes(mark.kind)) ? 'font-weight:700' : '',
    marks.some(mark => mark.kind === 'soft') ? 'font-style:italic;opacity:.72' : '',
    marks.some(mark => mark.kind === 'highlight') ? 'background:#fff1a8' : '',
    marks.some(mark => mark.kind === 'underline') ? 'text-decoration:underline' : '',
    marks.some(mark => mark.kind === 'melisma') ? 'text-decoration:underline wavy #087e72;text-underline-offset:7px' : '',
  ].join(';')
  function navigate(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    const target = event.target as HTMLButtonElement
    if (!target.matches('button[data-unit]')) return
    const buttons = [...target.closest('.score')!.querySelectorAll<HTMLButtonElement>('button[data-unit]')]
    const next = buttons[buttons.indexOf(target) + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1)]
    if (!next) return
    event.preventDefault()
    next.focus()
    if (event.shiftKey) {
      const unit = units(parsed, project.divisions, mode).find(item => item.start === Number(next.dataset.unit))
      if (unit) onselect(unit, true)
    }
  }
</script>

<div class="score" class:centered={project.alignment === 'center'} role="group" aria-label="Texto para marcação">
  {#if !parsed.text}<p class="empty-poem">Sem versos</p>{/if}
  {#each rows as row, verse}
    <div class="verse" data-verse={verse + 1}>
      {#each row as group}
        <span class="word" class:syllabic={project.separated && mode === 'syllable'}>
          {#each group as unit}
            {#if unit.word || /[\p{L}\p{N}\p{S}]/u.test(unit.text)}
              {@const marks = activeMarks(unit.start, unit.end)}
              <button class="unit" class:selected={!!selection && unit.start < selection.end && unit.end > selection.start} class:rising={marks.some(mark => mark.kind === 'rise')} class:falling={marks.some(mark => mark.kind === 'fall')} class:annotated={marks.some(mark => mark.kind === 'note')} data-unit={unit.start} aria-label={`${mode === 'letter' ? 'Letra' : 'Sílaba'} ${unit.text}, verso ${verse + 1}`} aria-pressed={!!selection && unit.start < selection.end && unit.end > selection.start} title={marks.map(mark => `${labels[mark.kind]}${mark.value && mark.kind !== 'color' ? ': ' + mark.value : ''}`).join(' · ') || unit.text} onclick={event => onselect(unit, event.shiftKey)} onkeydown={navigate}>{#each graphemes(unit.text) as glyph}<span style={glyphStyle(activeMarks(unit.start + glyph.start, unit.start + glyph.end))}>{glyph.text}</span>{/each}</button>
            {:else}<span class="punctuation">{unit.text}</span>{/if}
          {/each}
        </span>
      {/each}
    </div>
  {/each}
</div>