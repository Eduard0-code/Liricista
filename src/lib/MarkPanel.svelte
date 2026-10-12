<script lang="ts">
  import { Bold, Underline, Highlighter, AudioWaveform, ArrowUpRight, ArrowDownRight, Volume1, Volume2, MessageSquare, Trash2, Check, X } from '@lucide/svelte'
  import type { Mark, MarkKind, Project } from './model'
  import { labels } from './files'
  import type { Unit } from './syllables'
  let { selection, text, marks, word, parts, pending, onmark, onremove, ondivide, onresolve }: {
    selection: { start: number; end: number } | null; text: string; marks: Mark[];
    word: Unit['word'] | null; parts: string; pending: Project['pending'];
    onmark: (kind: MarkKind, value?: string) => void;
    onremove: (id?: string) => void; ondivide: (value: string) => void;
    onresolve: (id: string, apply: boolean) => void;
  } = $props()
  let note = $state('')
  let division = $state('')
  $effect(() => { division = parts })
  const palette = [{ name: 'Verde', value: '#087e72' }, { name: 'Coral', value: '#c84248' }, { name: 'Azul', value: '#2869a5' }, { name: 'Violeta', value: '#8555a3' }, { name: 'Grafite', value: '#252c2b' }]
  const vocal = [{ kind: 'soft' as const, icon: Volume1 }, { kind: 'strong' as const, icon: Volume2 }, { kind: 'rise' as const, icon: ArrowUpRight }, { kind: 'fall' as const, icon: ArrowDownRight }, { kind: 'melisma' as const, icon: AudioWaveform }]
</script>

<aside class="mark-panel" aria-label="Painel de marcações">
  <div class="panel-heading"><h2>Marcações</h2><span class="small-count">{marks.length}</span></div>
  <div class="selection-readout" aria-live="polite"><span class="eyebrow">Seleção</span><p>{selection ? text.slice(selection.start, selection.end) : 'Nenhuma seleção'}</p></div>
  <fieldset disabled={!selection}>
    <legend>Expressão</legend>
    <div class="format-tools">
      <button class="icon-button" title="Ênfase" aria-label="Ênfase" onclick={() => onmark('bold')}><Bold size={19} /></button>
      <button class="icon-button" title="Sublinhado" aria-label="Sublinhado" onclick={() => onmark('underline')}><Underline size={19} /></button>
      <button class="icon-button" title="Realce" aria-label="Realce" onclick={() => onmark('highlight')}><Highlighter size={19} /></button>
      <button class="icon-button" title="Limpar marcações da seleção" aria-label="Limpar marcações da seleção" onclick={() => onremove()}><Trash2 size={18} /></button>
    </div>
    <div class="palette" aria-label="Cores">{#each palette as color}<button class="swatch" style={`--swatch:${color.value}`} title={color.name} aria-label={`Cor ${color.name}`} onclick={() => onmark('color', color.value)}></button>{/each}</div>
    <div class="section-label">Voz</div>
    <div class="vocal-tools">{#each vocal as tool}<button class:wide={tool.kind === 'melisma'} onclick={() => onmark(tool.kind, note)}><tool.icon size={17} />{labels[tool.kind]}</button>{/each}</div>
    <label for="note">Anotação</label>
    <textarea id="note" class="note-input" rows="3" maxlength={2000} bind:value={note} placeholder="Respiração, duração, intenção..."></textarea>
    <button class="text-command" onclick={() => { onmark('note', note); note = '' }} disabled={!note.trim()}><MessageSquare size={16} />Vincular nota</button>
  </fieldset>
  {#if marks.length}<div class="applied-marks">{#each marks as mark}<div class="applied-mark"><span><strong>{labels[mark.kind]}</strong>{#if mark.value && mark.kind !== 'color'}<small>{mark.value}</small>{/if}</span>{#if !mark.id.startsWith('syntax-')}<button class="icon-button compact" title="Remover marcação" aria-label={`Remover ${labels[mark.kind]}`} onclick={() => onremove(mark.id)}><X size={15} /></button>{:else}<small class="source-label">Texto</small>{/if}</div>{/each}</div>{/if}
  <div class="division-panel"><h3>Divisão silábica</h3>{#if word}<label for="division">{word.text}</label><div class="division-input"><input id="division" bind:value={division} aria-label="Divisão silábica" /><button class="icon-button" title="Aplicar divisão" aria-label="Aplicar divisão" onclick={() => ondivide(division)}><Check size={18} /></button></div>{:else}<p class="muted">Nenhuma palavra selecionada</p>{/if}</div>
  {#if pending.length}<div class="pending-panel"><h3>Pendências <span class="small-count">{pending.length}</span></h3>{#each pending as item}<div class="pending-item"><p>“{item.quote}”</p><strong>{labels[item.mark.kind]}</strong>{#if item.mark.value}<p>{item.mark.value}</p>{/if}<small>{item.reason}</small><div class="pending-actions"><button disabled={!selection} onclick={() => onresolve(item.mark.id, true)}>Reaplicar</button><button class="icon-button" title="Descartar pendência" aria-label="Descartar pendência" onclick={() => onresolve(item.mark.id, false)}><Trash2 size={16} /></button></div></div>{/each}</div>{/if}
</aside>