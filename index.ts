import { ManifoldWebSocket } from './src/manifold/ws'

import { App } from '@slack/bolt'
import type { KnownBlock } from '@slack/types'
import { generateAnswerBlocks, generateDescriptionBlocks, generateProgressSection } from './src/blocks'

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar?d=mp'

const { SLACK_APP_TOKEN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, CHANNEL_LOGS } =
  process.env

const slack = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  appToken: SLACK_APP_TOKEN,
  token: SLACK_BOT_TOKEN,
  socketMode: true,
})

const conn = new ManifoldWebSocket()

conn.subscribe('global/new-contract', async ({ contract, creator }) => {
  console.log(JSON.stringify({ contract, creator }))
  if (CHANNEL_LOGS) {
    slack.client.chat.postMessage({
      channel: CHANNEL_LOGS,
      text: 'New market opened',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: 'New market opened' },
        },
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_preformatted',
              elements: [
                {
                  type: 'text',
                  text: JSON.stringify({ contract, creator }),
                },
              ],
            },
          ],
        },
      ],
    })
  }

  const closeElements = contract.closeTime
    ? [
        {
          type: 'mrkdwn' as const,
          text: `:clock4: Closes <!date^${Math.round(contract.closeTime / 1000)}^{date_short_pretty}|text>`,
        },
      ]
    : []

  if (contract.outcomeType === 'MULTIPLE_CHOICE') {
    await slack.client.chat.postMessage({
      channel: CHANNEL_LOGS!,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: contract.question },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'image',
              image_url: creator.avatarUrl || DEFAULT_AVATAR,
              alt_text: creator.name,
            },
            {
              type: 'plain_text',
              text: creator.name,
            },
            ...closeElements,
          ],
        },
        {
          type: 'divider',
        },
        ...contract.answers!.flatMap(generateAnswerBlocks),
        {
          type: 'divider',
        },
        ...generateDescriptionBlocks(contract.description),
        // {
        //   type: 'rich_text',
        //   elements: [
        //     {
        //       type: 'rich_text_section',
        //       elements: [
        //         {
        //           type: 'text',
        //           text: 'Resolution criteria',
        //           style: {
        //             bold: true,
        //           },
        //         },
        //       ],
        //     },
        //     {
        //       type: 'rich_text_section',
        //       elements: [
        //         {
        //           type: 'text',
        //           text: 'The market resolves based on Cloudflare\'s official determination of the root cause. Cloudflare identified the cause as an automatically generated configuration file used to manage threat traffic that "grew beyond an expected size of entries," which triggered a crash in the software system that handles traffic for several of its services. Resolution will be determined by Cloudflare\'s official incident report published on ',
        //         },
        //         {
        //           type: 'link',
        //           text: 'blog.cloudflare.com',
        //           url: 'https://blog.cloudflare.com',
        //         },
        //         {
        //           type: 'text',
        //           text: ' or their status page at ',
        //         },
        //         {
        //           type: 'link',
        //           text: 'cloudflarestatus.com',
        //           url: 'https://www.cloudflarestatus.com/',
        //         },
        //         {
        //           type: 'text',
        //           text: '.',
        //         },
        //       ],
        //     },
        //     {
        //       type: 'rich_text_section',
        //       elements: [],
        //     },
        //     {
        //       type: 'rich_text_section',
        //       elements: [
        //         {
        //           type: 'text',
        //           text: 'Background',
        //           style: {
        //             bold: true,
        //           },
        //         },
        //       ],
        //     },
        //     {
        //       type: 'rich_text_section',
        //       elements: [
        //         {
        //           type: 'text',
        //           text: "On November 18, 2025, Cloudflare experienced a global outage that knocked several major websites offline, including ChatGPT, X, Shopify, Indeed, Claude, Truth Social, and others. Cloudflare's software is used by many businesses worldwide, helping to manage and secure traffic for about 20% of the web.",
        //         },
        //       ],
        //     },
        //   ],
        // },
      ],
    })
  } else if (contract.outcomeType === 'BINARY') {
  }
})

await slack.start()
