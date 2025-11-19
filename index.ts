import {
  ManifoldWebSocket,
  type ManifoldBroadcastData,
} from './src/manifold/ws'

import { App } from '@slack/bolt'
import { generateAnswerBlocks, generateTiptapBlocks } from './src/blocks'

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

async function handleNewContract({
  contract,
  creator,
}: ManifoldBroadcastData['global/new-contract']) {
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
        ...generateTiptapBlocks(contract.description),
      ],
    })
  } else if (contract.outcomeType === 'BINARY') {
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
        ...generateAnswerBlocks({
          prob: contract.probability,
          text: 'Probability',
        }),
        {
          type: 'divider',
        },
        ...generateTiptapBlocks(contract.description),
      ],
    })
  }
}

conn.subscribe('global/new-contract', handleNewContract)

await slack.start()
