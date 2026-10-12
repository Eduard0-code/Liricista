declare module 'hyphen/pt' {
  export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number }): string
}

declare module 'mammoth/mammoth.browser.js' {
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>
}