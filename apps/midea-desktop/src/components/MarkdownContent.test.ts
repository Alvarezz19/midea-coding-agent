import { describe, expect, it } from 'vitest'

import { safeMarkdownUrl } from './MarkdownContent'

const node = {} as never

describe('Markdown media URL policy', () => {
  it('allows web content and image data while rejecting executable/local protocols', () => {
    expect(safeMarkdownUrl('https://media.example/demo.mp4', 'src', node)).toBe('https://media.example/demo.mp4')
    expect(safeMarkdownUrl('data:image/png;base64,AAAA', 'src', node)).toBe('data:image/png;base64,AAAA')
    expect(safeMarkdownUrl('data:text/html;base64,AAAA', 'src', node)).toBeNull()
    expect(safeMarkdownUrl('javascript:alert(1)', 'href', node)).toBeNull()
    expect(safeMarkdownUrl('file:///C:/secret.txt', 'src', node)).toBeNull()
  })
})
