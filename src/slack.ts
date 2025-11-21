import type { App } from '@slack/bolt'
import { generateContractBlocks } from './blocks'
import { getGloballySubscribedChannels } from './database'

const { CHANNEL_LOGS } = process.env

export async function handleNewContract(
  slack: App,
  { contract }: Manifold.WS.NewContract,
) {
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
              elements: [{ type: 'text', text: JSON.stringify(contract) }],
            },
          ],
        },
      ],
    })
  }

  const channels = await getGloballySubscribedChannels()

  const blocks = generateContractBlocks(contract)

  await Promise.all(
    channels.map(async (c) => {
      await slack.client.chat.postMessage({
        channel: c.id,
        text: `New market opened: ${contract.question}`,
        blocks,
      })
    }),
  )
}
