<script lang="ts">
  import { onMount } from 'svelte'
  import { Feather, Upload, Download, ChevronDown, Undo2, Redo2, FilePlus2, PenLine, AudioWaveform, AlignLeft, AlignCenter, Check, LoaderCircle, CircleAlert, X, ShieldCheck } from '@lucide/svelte'
  import Editor from './lib/Editor.svelte'
  import Score from './lib/Score.svelte'
  import MarkPanel from './lib/MarkPanel.svelte'
  import { cloneProject, createProject, type MarkKind, type Project } from './lib/model'
  import { parse } from './lib/parser'
  import { rewrite } from './lib/reconcile'
  import { units, validParts, type Unit } from './lib/syllables'
  import { download, exportDocx, importFile, projectJson, safeName } from './lib/files'
  import { restore, save } from './lib/storage'

  let project = $state<Project>(createProject('No intervalo de um suspiro,\na palavra aprende a voar.\n\nLevo o *tempo* nos meus passos,\ne um pouco de céu no olhar.', 'O que a voz guarda'))
  let ready = $state(false)
  let busy = $state(false)
  let view = $state<'write' | 'mark'>('write')
  let mode = $state<'letter' | 'syllable'>('syllable')
  let extendSelection = $state(false)
  let selection = $state<{ start: number; end: number } | null>(null)
  let anchor = $state<{ start: number; end: number } | null>(null)
  let word = $state<Unit['word'] | null>(null)
  let undoStack = $state<Project[]>([])
  let redoStack = $state<Project[]>([])
  let status = $state('Carregando')
  let error = $state('')
  let storageFailed = $state(false)
  let importer: HTMLInputElement
  let timer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  const parsed = $derived(parse(project.source))
  const selectedMarks = $derived(selection ? [...parsed.marks, ...project.marks].filter(mark => mark.start < selection!.end && mark.end > selection!.start) : [])
  const verses = $derived(parsed.text.split('\n').filter(line => line.trim()).length)
  const words = $derived(parsed.text.match(/[\p{L}\p{M}]+/gu)?.length || 0)
  const syllableParts = $derived(word ? units(parsed, project.divisions, 'syllable').filter(unit => unit.word?.start === word!.start).map(unit => unit.text).join('-') : '')

  onMount(() => {
    let cancelled = false
    restore().then(saved => {
      if (cancelled) return
      if (saved) project = saved
      status = saved ? 'Salvo neste navegador' : 'Rascunho de exemplo'
    }).catch(() => {
      if (cancelled) return
      status = 'Salvamento indisponível'
      storageFailed = true
      error = 'Não foi possível restaurar o arquivo local. Exporte um backup antes de sair.'
    }).finally(() => { if (!cancelled) ready = true })
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  })

  function scheduleSave() {
    if (timer) clearTimeout(timer)
    const currentRevision = ++revision
    status = 'Salvando...'
    const snapshot = cloneProject(project)
    timer = setTimeout(() => {
      save(snapshot).then(() => {
        if (currentRevision !== revision) return
        status = 'Salvo neste navegador'
        storageFailed = false
      }).catch(() => {
        if (currentRevision !== revision) return
        status = 'Falha ao salvar'
        storageFailed = true
        error = 'O navegador não salvou este rascunho. Baixe o projeto para não perder suas alterações.'
      })
    }, 400)
  }

  function commit(next: Project) {
    if (JSON.stringify(next) === JSON.stringify(project)) return
    undoStack = [...undoStack.slice(-79), cloneProject(project)]
    redoStack = []
    project = next
    scheduleSave()
  }

  function clearSelection() { selection = null; anchor = null; word = null; extendSelection = false }
  function history(direction: 'undo' | 'redo') {
    const stack = direction === 'undo' ? undoStack : redoStack
    const previous = stack.at(-1)
    if (!previous) return
    if (direction === 'undo') { undoStack = undoStack.slice(0, -1); redoStack = [...redoStack, cloneProject(project)] }
    else { redoStack = redoStack.slice(0, -1); undoStack = [...undoStack, cloneProject(project)] }
    project = cloneProject(previous)
    clearSelection()
    scheduleSave()
  }

  function keyboard(event: KeyboardEvent) {
    if (!ready || busy) return
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
      if ((event.target as HTMLElement)?.closest('.mark-panel')) return
      event.preventDefault()
      history(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo')
    }
    if (event.key === 'Escape') clearSelection()
  }

  function selectUnit(unit: Unit, extend: boolean) {
    if ((extend || extendSelection) && anchor) selection = { start: Math.min(anchor.start, unit.start), end: Math.max(anchor.end, unit.end) }
    else { anchor = { start: unit.start, end: unit.end }; selection = { ...anchor } }
    word = unit.word || null
  }

  function mark(kind: MarkKind, value = '') {
    if (!selection) return
    const next = cloneProject(project)
    next.marks = next.marks.filter(item => !(item.kind === kind && item.start === selection!.start && item.end === selection!.end))
    next.marks.push({ ...selection, id: crypto.randomUUID(), kind, value })
    commit(next)
  }

  function removeMark(id?: string) {
    if (!selection && !id) return
    const next = cloneProject(project)
    next.marks = next.marks.filter(item => id ? item.id !== id : !(item.start < selection!.end && item.end > selection!.start))
    commit(next)
  }

  function divide(value: string) {
    if (!word) return
    const parts = validParts(word.text, value)
    if (!parts) { error = 'A divisão deve manter as mesmas letras da palavra, separadas por hífens.'; return }
    const next = cloneProject(project)
    next.divisions = next.divisions.filter(item => item.start !== word!.start)
    next.divisions.push({ start: word.start, end: word.end, word: word.text, parts })
    commit(next)
    error = ''
  }

  function resolvePending(id: string, apply: boolean) {
    const item = project.pending.find(item => item.mark.id === id)
    if (!item || (apply && !selection)) return
    const next = cloneProject(project)
    next.pending = next.pending.filter(item => item.mark.id !== id)
    if (apply && selection) next.marks.push({ ...item.mark, ...selection })
    commit(next)
  }

  async function openFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (parsed.text.trim() && !window.confirm('Substituir o rascunho atual pelo arquivo importado? A alteração pode ser desfeita.')) return
    busy = true
    error = ''
    try { commit(await importFile(file)); clearSelection(); view = 'write' }
    catch (cause) { error = cause instanceof Error ? cause.message : 'Não foi possível importar o arquivo.' }
    finally { busy = false }
  }

  async function exportFile(format: 'project' | 'docx' | 'txt') {
    busy = true
    error = ''
    try {
      const name = safeName(project.title)
      if (format === 'project') download(new Blob([projectJson(project)], { type: 'application/json' }), `${name}.liricista.json`)
      if (format === 'txt') download(new Blob([parsed.text], { type: 'text/plain;charset=utf-8' }), `${name}.txt`)
      if (format === 'docx') download(await exportDocx(cloneProject(project)), `${name}.docx`)
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Não foi possível exportar o arquivo.' }
    finally { busy = false }
  }

  function newProject() {
    if (!window.confirm('Começar um novo texto? O rascunho atual pode ser recuperado com Desfazer.')) return
    commit(createProject())
    view = 'write'
    clearSelection()
  }
</script>

<svelte:window onkeydown={keyboard} />

<header class="app-header">
  <a class="brand" href={import.meta.env.BASE_URL} aria-label="Liricista"><Feather size={25} strokeWidth={1.6} /><h1>Liricista<span class="brand-dot">.</span></h1></a>
  <div class="header-actions">
    <button class="icon-button" title="Novo texto" aria-label="Novo texto" disabled={!ready || busy} onclick={newProject}><FilePlus2 size={19} /></button>
    <button class="header-command" aria-label="Importar" disabled={!ready || busy} onclick={() => importer.click()}><Upload size={17} /><span>Importar</span></button>
    <details class="export-menu">
      <summary class="primary-command"><Download size={17} /><span>Exportar</span><ChevronDown size={14} /></summary>
      <div class="menu-options">
        <button disabled={!ready || busy} onclick={() => exportFile('docx')}>Documento Word <small>.docx</small></button>
        <button disabled={!ready || busy} onclick={() => exportFile('project')}>Projeto completo <small>.json</small></button>
        <button disabled={!ready || busy} onclick={() => exportFile('txt')}>Texto simples <small>.txt</small></button>
      </div>
    </details>
    <input bind:this={importer} type="file" accept=".txt,.docx,.json" hidden onchange={openFile} aria-label="Importar arquivo" />
  </div>
</header>

<main aria-busy={!ready || busy}>
  <div class="document-heading">
    <div class="document-meta"><span class="eyebrow">Caderno de versos</span><span class="save-state" class:warning={storageFailed} role="status">{#if status === 'Salvando...' || !ready}<LoaderCircle size={13} class="spin" />{:else if storageFailed}<CircleAlert size={13} />{:else}<Check size={13} />{/if}{status}</span></div>
    <input class="document-title" aria-label="Título do texto" value={project.title} maxlength={200} disabled={!ready || busy} oninput={event => commit({ ...cloneProject(project), title: event.currentTarget.value })} placeholder="Sem título" />
    <div class="document-stats"><span>{verses} versos</span><span>{words} palavras</span>{#if project.pending.length}<span class="pending-count">{project.pending.length} pendências</span>{/if}</div>
  </div>
  {#if error}<div class="error-banner" role="alert"><CircleAlert size={18} /><p>{error}</p><button class="icon-button" title="Fechar aviso" aria-label="Fechar aviso" onclick={() => error = ''}><X size={17} /></button></div>{/if}
  <div class="workspace-toolbar">
    <div class="view-tabs" role="tablist" aria-label="Etapa do texto">
      <button id="write-tab" role="tab" aria-selected={view === 'write'} aria-controls="workspace" class:active={view === 'write'} onclick={() => { view = 'write'; clearSelection() }}><PenLine size={16} />Escrever</button>
      <button id="mark-tab" role="tab" aria-selected={view === 'mark'} aria-controls="workspace" class:active={view === 'mark'} onclick={() => view = 'mark'}><AudioWaveform size={17} />Marcar</button>
    </div>
    <div class="history-tools"><button class="icon-button" title="Desfazer" aria-label="Desfazer" disabled={!undoStack.length || busy} onclick={() => history('undo')}><Undo2 size={17} /></button><button class="icon-button" title="Refazer" aria-label="Refazer" disabled={!redoStack.length || busy} onclick={() => history('redo')}><Redo2 size={17} /></button></div>
    {#if view === 'mark'}<div class="layout-tools" role="group" aria-label="Alinhamento"><button class="icon-button" title="Alinhar à esquerda" aria-label="Alinhar à esquerda" aria-pressed={project.alignment === 'left'} onclick={() => commit({ ...cloneProject(project), alignment: 'left' })}><AlignLeft size={17} /></button><button class="icon-button" title="Centralizar" aria-label="Centralizar" aria-pressed={project.alignment === 'center'} onclick={() => commit({ ...cloneProject(project), alignment: 'center' })}><AlignCenter size={17} /></button></div>{/if}
  </div>
  <div id="workspace" class="workspace" class:marking={view === 'mark'} role="tabpanel" aria-labelledby={view === 'write' ? 'write-tab' : 'mark-tab'}>
    {#if !ready}<div class="loading-state"><LoaderCircle size={24} class="spin" /></div>
    {:else if view === 'write'}<div class="editor-surface"><Editor source={project.source} onchange={source => { commit(rewrite(project, source)); clearSelection() }} /><div class="editor-bottom"><Feather size={15} /><span>{parsed.text.length} caracteres</span><button class="text-command" onclick={() => view = 'mark'}>Marcar texto <AudioWaveform size={16} /></button></div></div>
    {:else}
      <section class="score-surface" aria-label="Visualização do texto">
        <div class="score-toolbar"><div class="segmented" role="group" aria-label="Unidade de seleção"><button aria-pressed={mode === 'letter'} onclick={() => { mode = 'letter'; clearSelection() }}>Letras</button><button aria-pressed={mode === 'syllable'} onclick={() => { mode = 'syllable'; clearSelection() }}>Sílabas</button></div><label class="checkbox-label"><input type="checkbox" checked={project.separated} onchange={event => commit({ ...cloneProject(project), separated: event.currentTarget.checked })} />Separar sílabas</label><label class="checkbox-label"><input type="checkbox" bind:checked={extendSelection} />Intervalo</label></div>
        <Score {parsed} {project} {mode} {selection} onselect={selectUnit} />
      </section>
      <MarkPanel {selection} text={parsed.text} marks={selectedMarks} {word} parts={syllableParts} pending={project.pending} onmark={mark} onremove={removeMark} ondivide={divide} onresolve={resolvePending} />
    {/if}
  </div>
  <footer class="workspace-footer"><span><ShieldCheck size={14} />Local · sem conta</span><span>{view === 'write' ? 'Rascunho' : 'Voz & expressão'}</span></footer>
</main>
