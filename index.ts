import { ManifoldWebSocket } from './src/manifold/ws'

import { App } from '@slack/bolt'
import { handleNewContract } from './src/slack'

const {
  SLACK_APP_TOKEN,
  SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET,
  CHANNEL_LOGS,
  MANIFOLD_WS_URL,
} = process.env

const slack = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  appToken: SLACK_APP_TOKEN,
  token: SLACK_BOT_TOKEN,
  socketMode: true,
})

const conn = new ManifoldWebSocket({ url: MANIFOLD_WS_URL })

async function generalHandler(event: string, data: any) {
  console.log(JSON.stringify(data))
  if (CHANNEL_LOGS) {
    slack.client.chat.postMessage({
      channel: CHANNEL_LOGS,
      text: `Event received: ${event}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `Event received: ${event}` },
        },
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_preformatted',
              elements: [
                {
                  type: 'text',
                  text: JSON.stringify(data),
                },
              ],
            },
          ],
        },
      ],
    })
  }
}

conn.subscribe('global/new-contract', (e) => handleNewContract(slack, e))
conn.subscribe('global/new-bet', (e) => generalHandler('global/new-bet', e))
conn.subscribe('global/new-comment', (e) =>
  generalHandler('global/new-comment', e),
)
conn.subscribe('global/new-subsidy', (e) =>
  generalHandler('global/new-subsidy', e),
)
conn.subscribe('global/updated-contract', (e) =>
  generalHandler('global/updated-contract', e),
)

await slack.start()
