import type {
  ContextBlockElement,
  KnownBlock,
  RichTextBlockElement,
  RichTextElement,
  RichTextSection,
  RichTextText,
} from '@slack/types'
import type { Channel } from './database'

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

export function generateAnswerBlocks(
  answer: {
    probability: number
    text: string
    contractId?: string
    id?: string
  },
  closed: boolean = false,
): KnownBlock[] {
  const betBlocks: KnownBlock[] =
    answer.contractId && !closed
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'YES', emoji: true },
                value: JSON.stringify({
                  outcome: 'YES',
                  answerId: answer.id,
                  contractId: answer.contractId,
                }),
                style: 'primary',
                action_id: 'bet-yes',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'NO',
                },
                value: JSON.stringify({
                  outcome: 'NO',
                  answerId: answer.id,
                  contractId: answer.contractId,
                }),
                style: 'danger',
                action_id: 'bet-no',
              },
            ],
          },
        ]
      : []

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
        generateProgressSection(answer.probability),
      ],
    },
    ...betBlocks,
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
    const elements = generateTiptapElements(content.content)
    if (!elements.length) {
      return []
    }
    return [
      {
        type: 'rich_text_section',
        elements: elements.map((e) => ({
          ...e,
          style: Object.assign(e.style ?? {}, { bold: true }),
        })),
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

function generatePollOptionsBlocks(
  options: { text: string; votes: number }[],
): KnownBlock[] {
  const sumVotes = options.reduce((s, v) => s + v.votes, 0)
  console.log(options, sumVotes)
  return options.flatMap((o) =>
    generateAnswerBlocks({
      text: o.text,
      probability: sumVotes ? o.votes / sumVotes : 0,
    }),
  )
}

export function generateContractBlocks(
  contract: Manifold.API.Contract,
): KnownBlock[] {
  const isClosed = !!(contract.closeTime && contract.closeTime < Date.now())

  const closeElements = contract.closeTime
    ? [
        {
          type: 'mrkdwn' as const,
          text: `Closes *<!date^${Math.round(contract.closeTime / 1000)}^{date_short_pretty}|text>*`,
        },
      ]
    : []

  const answerBlocks =
    contract.outcomeType === 'MULTIPLE_CHOICE' ||
    contract.outcomeType === 'MULTI_NUMERIC' ||
    contract.outcomeType === 'DATE'
      ? contract
          .answers!.flatMap((a) => generateAnswerBlocks(a, isClosed))
          .concat([{ type: 'divider' }])
      : contract.outcomeType === 'BINARY'
        ? generateAnswerBlocks(
            {
              probability: contract.probability,
              text: 'Probability',
              contractId: contract.id,
            },
            isClosed,
          ).concat([{ type: 'divider' }])
        : contract.outcomeType === 'POLL'
          ? generatePollOptionsBlocks(contract.options!)
          : []

  const liquidityElements: ContextBlockElement[] =
    contract.outcomeType === 'POLL'
      ? []
      : [
          {
            type: 'mrkdwn',
            text: `*M${contract.totalLiquidity}* liquidity`,
          },
        ]

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${contract.question}*`,
      },
      accessory: {
        type: 'overflow',
        options: [
          {
            text: {
              type: 'plain_text',
              text: ':link: Open on Manifold',
              emoji: true,
            },
            url: contract.url,
          },
        ],
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'image',
          image_url:
            contract.creatorAvatarUrl || 'https://www.gravatar.com/avatar?d=mp',
          alt_text: contract.creatorName,
        },
        {
          type: 'plain_text',
          text: contract.creatorName,
        },
        ...closeElements,
        {
          type: 'mrkdwn',
          text: `*M${Math.floor(contract.volume)}* volume`,
        },
        ...liquidityElements,
        {
          type: 'mrkdwn',
          text: `*${contract.uniqueBettorCount}* holders`,
        },
      ],
    },
    {
      type: 'divider',
    },
    ...answerBlocks,
    ...generateTiptapBlocks(contract.description),
  ]
}

// slack & db

export const closeButtonBlock = {
  type: 'actions',
  elements: [
    {
      type: 'button',
      text: {
        type: 'plain_text',
        text: ':x: Close',
        emoji: true,
      },
      action_id: 'delete',
    },
  ],
} as const

export function generateChannelOptsBlocks(channel: Channel) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Manage channel opts*\n\n<#${channel.id}> will receive...`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*A message for new markets*: ${channel.subscribe_new_markets ? 'Yes' : 'No'}`,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: channel.subscribe_new_markets ? 'Turn off' : 'Turn on',
          emoji: true,
        },
        value: JSON.stringify({
          id: channel.id,
          value: !channel.subscribe_new_markets,
        }),
        style: channel.subscribe_new_markets ? 'danger' : 'primary',
        action_id: 'channel-market-opt',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*A thread reply for new bets*: ${channel.subscribe_new_bets ? 'Yes' : 'No'}\n_This only applies to new markets._`,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: channel.subscribe_new_bets ? 'Turn off' : 'Turn on',
        },
        value: JSON.stringify({
          id: channel.id,
          value: !channel.subscribe_new_bets,
        }),
        style: channel.subscribe_new_bets ? 'danger' : 'primary',
        action_id: 'channel-bet-opt',
      },
    },
    closeButtonBlock,
  ]
}
