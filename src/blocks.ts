import type {
  KnownBlock,
  RichTextBlockElement,
  RichTextSection,
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
        text: progressBar(prob, 24),
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
  contractId: string
  id: string
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

export function generateDescriptionBlocks(content: any) {
  return []
}
