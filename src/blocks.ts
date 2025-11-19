import type {
  KnownBlock,
  RichTextBlockElement,
  RichTextElement,
  RichTextSection,
  RichTextText,
} from '@slack/types'

const BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'] as const

function progressBar(percentage: number, size: number) {
  const blocks = percentage * size
  return (
    BLOCKS[8].repeat(Math.floor(blocks)) +
    (Math.floor(blocks) === blocks
      ? ''
      : BLOCKS[Math.round(blocks - Math.floor(blocks)) * 8]) +
    BLOCKS[0].repeat(size - Math.ceil(blocks))
  )
}

export function generateProgressSection(prob: number): RichTextSection {
  return {
    type: 'rich_text_section',
    elements: [
      {
        type: 'text',
        text: progressBar(prob, 30),
        style: {
          code: true,
        },
      },
      {
        type: 'text',
        text: ` ${(prob * 100).toFixed(1)} %`,
      },
    ],
  }
}

export function generateAnswerBlocks(answer: {
  prob: number
  text: string
  // contractId: string
  // id: string
}): KnownBlock[] {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'text',
              text: answer.text,
              style: { bold: true },
            },
          ],
        },
        generateProgressSection(answer.prob),
      ],
    },
    // {
    //   type: 'context_actions',
    //   elements: [
    //     {
    //       type: 'feedback_buttons',
    //       action_id: 'bet',
    //       positive_button: {
    //         text: { type: 'plain_text', text: 'Bet YES' },
    //         value: JSON.stringify({}),
    //       },
    //       negative_button: {
    //         text: { type: 'plain_text', text: 'Bet NO' },
    //         value: `no-${contract.id}-${a.id}`,
    //       },
    //     },
    //   ],
    // },
  ]
}

export function generateTiptapBlocks(content: any): KnownBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'section', text: { type: 'plain_text', text: content } }]
  }
  if (!content.content) {
    return []
  }
  const blocks = [
    {
      type: 'rich_text',
      elements: content.content.flatMap(generateTiptapBlockElements),
    },
  ] satisfies KnownBlock[]
  return blocks
}

function generateTiptapBlockElements(content: any): RichTextBlockElement[] {
  if (!content.content) {
    return []
  }
  if (content.type === 'heading') {
    return [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: content.content[0].text,
            style: { bold: true },
          },
        ],
      },
    ]
  } else if (content.type === 'paragraph') {
    const blocks: RichTextBlockElement[] = [
      {
        type: 'rich_text_section',
        elements: content.content.flatMap(generateTiptapElements),
      },
    ]
    return blocks.filter(({ elements }) => elements.length)
  }
  return [
    {
      type: 'rich_text_section',
      elements: [{ type: 'text', text: `[Unknown block "${content.type}"]` }],
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
  }
  return [{ type: 'text', text: ` [Unknown block "${content.type}"] ` }]
}
