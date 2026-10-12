<script lang="ts">
  let { source, onchange }: { source: string; onchange: (source: string) => void } = $props()
</script>

<textarea class="writing-area" aria-label="Texto original" placeholder="O primeiro verso..." value={source} maxlength={200000} oninput={event => onchange(event.currentTarget.value)} spellcheck="true"></textarea>