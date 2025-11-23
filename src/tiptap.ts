import type {
  ContextBlockElement,
  KnownBlock,
  RichTextBlockElement,
  RichTextElement,
  RichTextList,
  RichTextSection,
  RichTextText,
} from '@slack/types'

export function generateTiptapBlocks(content: any): KnownBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'section', text: { type: 'plain_text', text: content } }]
  }
  const { type } = content
  if (type === 'doc') {
    return [
      {
        type: 'rich_text',
        elements: content.content.flatMap(generateTiptapBlockElements),
      },
    ]
  }
  return [
    {
      type: 'section',
      text: { type: 'plain_text', text: '[Description is invalid]' },
    },
  ]
}

function generateTiptapBlockElements(content: any): RichTextBlockElement[] {
  if (content.type === 'heading') {
    if (!content.content) return []
    const elements: RichTextElement[] = content.content.flatMap(
      generateTiptapElements,
    )
    const blocks: RichTextBlockElement[] = [
      {
        type: 'rich_text_section',
        elements: elements.map((e) => ({
          ...e,
          style: Object.assign(e.style ?? {}, { bold: true }),
        })),
      },
    ]
    return blocks.filter(({ elements }) => elements.length)
  } else if (content.type === 'paragraph') {
    if (!content.content) return []
    const blocks: RichTextBlockElement[] = [
      {
        type: 'rich_text_section',
        elements: content.content.flatMap(generateTiptapElements),
      },
    ]
    return blocks.filter(({ elements }) => elements.length)
  } else if (content.type === 'bulletList') {
    if (!content.content) return []
    const blocks: RichTextList[] = [
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: content.content.map(
          (listItem: any) =>
            ({
              type: 'rich_text_section',
              elements: listItem.content.flatMap(generateTiptapElements),
            }) satisfies RichTextSection,
        ),
      },
    ]
    return blocks.filter(({ elements: [section] }) => section!.elements.length)
  } else if (content.type === 'orderedList') {
    if (!content.content) return []
    const blocks: RichTextList[] = [
      {
        type: 'rich_text_list',
        style: 'ordered',
        elements: content.content.map(
          (listItem: any) =>
            ({
              type: 'rich_text_section',
              elements: listItem.content.flatMap(generateTiptapElements),
            }) satisfies RichTextSection,
        ),
      },
    ]
    return blocks.filter(({ elements: [section] }) => section!.elements.length)
  } else if (content.type === 'horizontalRule') {
    return [
      {
        type: 'rich_text_section',
        elements: [{ type: 'text', text: '--------------------' }],
      },
    ]
  }
  return [
    {
      type: 'rich_text_section',
      elements: [
        { type: 'text', text: `[Unknown block element "${content.type}"]` },
      ],
    },
  ]
}

function generateTiptapElements(content: any): RichTextElement[] {
  if (content.type === 'text') {
    const text = content.text
    if (!text) {
      return []
    }
    const marks = content.marks ?? []
    const style: RichTextText['style'] & {} = {}
    let link: string | undefined = undefined
    let spoiler = false
    for (const mark of marks) {
      if (mark.type === 'bold') {
        style.bold = true
      }
      if (mark.type === 'italic') {
        style.italic = true
      }
      if (mark.type === 'spoiler') {
        spoiler = true
      }
      if (mark.type === 'link') {
        link = mark.attrs.href
      }
    }
    if (spoiler) {
      style.code = true
      return [{ type: 'text', text: '[spoiler]', style }]
    }
    if (link) {
      return [{ type: 'link', text, url: link, style }]
    }
    return [{ type: 'text', text, style }]
  } else if (content.type === 'contract-mention') {
    const { label } = content.attrs
    return [
      {
        type: 'link',
        text: 'Linked market',
        url: `https://manifold.markets${label}`,
      },
    ]
  } else if (content.type === 'hardBreak') {
    return [{ type: 'text', text: '\n' }]
  } else if (content.type === 'paragraph') {
    const elements: RichTextElement[] = content.content.flatMap(
      generateTiptapElements,
    )
    return elements.concat([{ type: 'text', text: '\n' }])
  } else if (content.type === 'bulletList') {
    return content.content.flatMap((listItem: any) => [
      { type: 'text', text: '- ' },
      ...listItem.content.flatMap(generateTiptapElements),
    ])
  } else if (content.type === 'orderedList') {
    return content.content.flatMap((listItem: any, index: number) => [
      { type: 'text', text: `${index + 1}. ` },
      ...listItem.content.flatMap(generateTiptapElements),
    ])
  }
  return [{ type: 'text', text: ` [Unknown element "${content.type}"] ` }]
}
