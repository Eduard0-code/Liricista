# Liricista

Caderno de poesias, poemas e líricas, com marcações de expressão vocal por letra ou sílaba. Aplicação estática em **Svelte 5 + Vite + TypeScript**, sem cadastro, backend ou envio dos textos a servidores.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Eduard0-code/Liricista)
[![Test and Deploy Pages](https://github.com/Eduard0-code/Liricista/actions/workflows/pages.yml/badge.svg)](https://github.com/Eduard0-code/Liricista/actions/workflows/pages.yml)

Escreva letras, marque sílabas e registre indicações vocais. O projeto funciona direto no navegador, salva os rascunhos localmente e exporta para TXT, DOCX ou projeto completo.

## Executar

Requer Node.js 24 LTS e npm. Execute os comandos na raiz deste repositório (a pasta que contém este README e `package.json`).

```sh
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite. A primeira abertura oferece um rascunho de exemplo original; **Novo texto** inicia um documento vazio. A licença existente foi preservada.

## Escrever e Marcar

1. Digite o título e os versos em **Escrever**, ou importe um TXT, DOCX ou projeto Liricista.
2. Abra **Marcar** e escolha **Letras** ou **Sílabas**. Clique em uma unidade para selecioná-la.
3. Para selecionar um intervalo, clique na primeira unidade e use Shift + clique na última. Em telas de toque, ative **Intervalo** antes do segundo toque.
4. Aplique cor, ênfase, sublinhado, realce, suave, forte, subida, descida ou melisma. Preencha **Anotação** antes de uma marca vocal para associar uma descrição; **Vincular nota** adiciona uma nota independente.
5. Corrija a palavra selecionada em **Divisão silábica**, separando as partes por hífens e mantendo todas as letras. Uma correção manual tem prioridade sobre a sugestão e sobre a sintaxe do texto.
6. Escolha alinhamento à esquerda ou centralizado e, no modo de sílabas, exibição contínua ou separada.

Tab navega pelos controles; Enter/Espaço selecionam uma unidade; as setas movem o foco entre as unidades. Shift + seta amplia o intervalo depois de selecionar a primeira unidade. Escape limpa a seleção. Ctrl/Cmd + Z desfaz e Ctrl/Cmd + Shift + Z ou Ctrl + Y refaz. Os campos de anotação e divisão mantêm seu histórico nativo. O histórico do projeto tem até 80 estados e não é restaurado após recarregar.

Melisma usa sublinhado ondulado e anotação. Subida/descida usam indicadores inclinados; notas aparecem no painel e no título acessível ao passar o cursor. Não há áudio, partitura nem análise musical.

**As sugestões portuguesas são hifenização aproximada, não escansão poética.** Palavras curtas podem não receber sugestões; todas podem ser corrigidas manualmente. Não há contagem automática de sílabas poéticas, sinalefa ou tonicidade.

## Sintaxe

| Entrada | Marcação |
| --- | --- |
| `*ênfase*` | Negrito |
| `_sublinhado_` | Sublinhado |
| `=realce=` | Realce |
| `<suave>` | Suave/itálico |
| `>forte>` | Forte/negrito |
| `/subida/` | Subida |
| `\descida\` | Descida |
| `a-mor` | Divisão manual, exibida como `amor` |

Um trecho entre crases é **literal**: símbolos e hífens nele não são interpretados. Dentro de um trecho literal, duas crases seguidas representam uma crase. Delimitadores isolados permanecem como texto. Use pares bem formados e aninhados; não cruze pares. Quebras de linha mantêm versos e linhas vazias mantêm estrofes.

TXT e DOCX importados entram como texto literal, para preservar os símbolos do arquivo em vez de interpretá-los como comandos. O editor mostra as crases que delimitam esses trechos; a visualização e a exportação exibem só o conteúdo. Para introduzir sintaxe em um texto importado, edite os delimitadores literais no editor.

## Reescrita

O modelo separa texto original, texto exibido, mapeamento de origem, marcações e correções silábicas. Posições internas são offsets UTF-16; seleção de letras usa grafemas, preservando acentos combinantes e emojis.

Marcações feitas no painel são reconciliadas com `diff`: trechos únicos, inalterados e contíguos mantêm a marcação, mesmo com alterações no mesmo verso. Se um trecho marcado mudar, desaparecer, receber uma inserção interna ou se repetir, a marcação vai para **Pendências**, com seu texto anterior e anotação. Selecione o novo trecho e use **Reaplicar**, ou descarte explicitamente a pendência. A política é conservadora: uma letra repetida pode exigir revisão mesmo ao editar outra parte do texto.

Marcações da sintaxe são recalculadas a partir dos símbolos e têm o rótulo **Texto** no painel; remova seus delimitadores no editor para removê-las. O botão de limpeza remove apenas marcações aplicadas no painel. Correções silábicas só são preservadas quando sua palavra permanece identificável; se a palavra mudar ou ficar ambígua, a sugestão padrão volta a ser usada.

## Arquivos

| Formato | Importação | Exportação | Preservação |
| --- | --- | --- | --- |
| TXT UTF-8 | Sim | Sim | Texto exibido, versos e estrofes |
| DOCX | Sim, como texto | Sim | Estilos compatíveis e anotações |
| `.liricista.json` | Sim | Sim | Projeto completo, marcações, divisões e pendências |
| ODT/ODF | Não nesta versão | Não nesta versão | Previsto para uma etapa futura |

DOCX preserva negrito, itálico, cor, sublinhado, realce e alinhamento. Melisma é exportado como sublinhado simples com descrição; as outras indicações vocais e notas têm referências por verso e posição na seção **Anotações**. A aparência pode variar entre Word e LibreOffice. A separação visual de sílabas não altera o texto exportado; use o projeto JSON para preservar as divisões. Importar um DOCX não restaura suas marcações nem replica sua diagramação.

Arquivos de projeto são validados com Zod, incluindo intervalos e divisões. A importação tem limite de 10 MB e o texto original, de 200 mil caracteres. Documentos muito grandes ou compactados podem consumir muita memória; prefira arquivos pequenos de origem confiável. As bibliotecas de DOCX são carregadas apenas ao importar/exportar esse formato.

## Salvamento e Privacidade

O rascunho atual é salvo no IndexedDB do navegador, 400 ms após uma alteração. Aguarde **Salvo neste navegador** antes de recarregar ou fechar. Se o armazenamento estiver bloqueado, corrompido ou sem espaço, a tela informa a falha e continua permitindo edição e exportação.

**Autosave não é backup.** Baixe regularmente o projeto completo. Limpar os dados do navegador, usar outro dispositivo/perfil, modo privado ou mudar de domínio pode remover ou separar seus rascunhos. Só existe um rascunho local por origem; não há sincronização e abas simultâneas podem sobrescrever o salvamento uma da outra. O histórico de desfazer não é incluído no backup.

Fontes, ícones e bibliotecas são servidos junto com o site. Não há analytics, contas, chamadas de IA ou requisições externas para processar os textos. Netlify/GitHub podem registrar os acessos normais ao site, mas o conteúdo digitado e os arquivos importados não são enviados pela aplicação.

## Publicação

### Netlify

Conecte este repositório ao Netlify. `netlify.toml` define Node 24, build `npm run build` e diretório de publicação `dist`. A raiz configurada deve ser a raiz do repositório clonado, não a pasta externa usada para guardá-lo. Também é possível executar `npm run build` e publicar a pasta `dist` manualmente. A base padrão `./` permite hospedar na raiz ou em uma pasta.

### GitHub Pages

Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**. Confira também o ambiente **github-pages** em **Settings → Environments** (crie-o se necessário e autorize a branch de publicação). Enquanto esse ambiente não existir, a extensão de GitHub Actions no editor pode indicar `Value 'github-pages' is not valid`; esse é um pré-requisito remoto, não um erro de sintaxe do workflow.

O workflow `.github/workflows/pages.yml` executa tipos, testes e build, publica após push em `main`/`master` e só testa pull requests. O caminho base é calculado a partir do nome do repositório, ou `/` para repositórios `*.github.io`. Domínio personalizado exige ajustar `BASE_PATH` para `/` e configurar o domínio no GitHub. A publicação efetiva requer enviar as alterações ao GitHub e habilitar Pages.

Para testar explicitamente uma subpasta no PowerShell:

```powershell
$env:BASE_PATH = '/Liricista/'
npm run build
npm run preview
```

Abra `/Liricista/` no endereço do preview. Use `Remove-Item Env:BASE_PATH` para voltar à base padrão antes de iniciar um novo comando. Não abra `dist/index.html` por `file://`: sirva os arquivos via HTTP/HTTPS.

## Verificação

```sh
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Vitest cobre parser, acentos, literais, quebras, grafemas, reconciliação, divisões, TXT, projeto completo, DOCX e falhas de armazenamento. Playwright cobre desktop e celular, seleção por teclado, estilos, melisma, desfazer/refazer, pendências, recarga, downloads, importação e IndexedDB indisponível. Capturas ficam em `test-results` (ignorado no Git).

Para testar uma hospedagem já servida, defina `E2E_BASE_URL`, incluindo a subpasta e a barra final, antes de `npm run test:e2e`. Sem essa variável, Playwright inicia o Vite automaticamente. Testes automatizados não substituem revisão visual no Word/LibreOffice nem testes em dispositivos e navegadores diferentes.

### Dependências

`npm audit` aponta três alertas moderados na cadeia `mammoth → argparse → sprintf-js`, usada pelo CLI Node da biblioteca. A aplicação importa explicitamente `mammoth.browser.js`; ainda assim, os alertas constam na árvore instalada. Não aplique `npm audit fix --force` indiscriminadamente: a sugestão atual regride para um Mammoth antigo e incompatível. Acompanhe a correção upstream antes de futuras atualizações. O processamento de documentos não confiáveis merece cautela mesmo sem esses alertas.

## Estrutura

- `src/lib/model.ts`, `parser.ts`, `reconcile.ts`: modelo, sintaxe e preservação.
- `src/lib/syllables.ts`: hifenização e correções por ocorrência.
- `src/lib/files.ts`, `storage.ts`: arquivos e armazenamento local.
- `src/lib/Editor.svelte`, `Score.svelte`, `MarkPanel.svelte`: escrita, visualização e ferramentas.
- `src/App.svelte`: fluxo, histórico e integração.
- `tests/editor.spec.ts`: testes de navegador.
- `netlify.toml`, `.github/workflows/pages.yml`: publicação estática.