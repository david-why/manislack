import { App } from '@slack/bolt'
import { Client as ManifoldClient } from './src/manifold/api'
import { ManifoldWebSocket } from './src/manifold/ws'
import {
  handleChannelBetOptButton,
  handleChannelMarketOptButton,
  handleChannelOptsCommand,
  handleCreateBetButton,
  handleNewBet,
  handleNewContract,
  handleUpdatedContract,
  type CreateBetData,
} from './src/slack'
import { closeButtonBlock } from './src/blocks'

const {
  SLACK_APP_TOKEN,
  SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET,
  CHANNEL_LOGS,
  MANIFOLD_WS_URL,
  MANIFOLD_API_URL,
  MANIFOLD_API_KEY,
} = process.env

const slack = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  appToken: SLACK_APP_TOKEN,
  token: SLACK_BOT_TOKEN,
  socketMode: true,
})

const manifold = new ManifoldClient({
  url: MANIFOLD_API_URL,
  token: MANIFOLD_API_KEY,
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

conn.subscribe('global/new-contract', (e) =>
  handleNewContract(slack, manifold, e),
)
conn.subscribe('global/new-bet', (e) => handleNewBet(slack, manifold, e))
conn.subscribe('global/updated-contract', (e) =>
  handleUpdatedContract(slack, manifold, e),
)

conn.subscribe('global/new-comment', (e) =>
  generalHandler('global/new-comment', e),
)
conn.subscribe('global/new-subsidy', (e) =>
  generalHandler('global/new-subsidy', e),
)

slack.action('delete', async ({ ack, respond }) => {
  await ack()
  await respond({ delete_original: true })
})

slack.action('bet', async ({ body, ack, payload, respond }) => {
  if (body.type !== 'block_actions' || payload.type !== 'feedback_buttons')
    return
  await ack()
  await handleCreateBetButton(
    slack,
    manifold,
    body.trigger_id,
    JSON.parse(payload.value),
    respond,
  )
})

slack.view('bet-modal', async ({ ack, payload }) => {
  await ack()
  const betInfo = JSON.parse(payload.private_metadata) as CreateBetData
  const amount = parseInt(payload.state.values.amount!.value!.value!)
  await manifold.placeBet({
    amount,
    contractId: betInfo.contractId,
    outcome: betInfo.outcome,
    answerId: betInfo.answerId,
  })
})

// /manislack-channel-opts [#channel]

slack.command(
  /\/manislack-(?:dev-)?channel-opts/,
  async ({ ack, payload, respond }) => {
    await ack()
    await handleChannelOptsCommand(slack, payload, respond)
  },
)

slack.action('channel-market-opt', async ({ ack, payload, respond }) => {
  if (payload.type !== 'button') return
  await ack()
  await respond(await handleChannelMarketOptButton(JSON.parse(payload.value!)))
})

slack.action('channel-bet-opt', async ({ ack, payload, respond }) => {
  if (payload.type !== 'button') return
  await ack()
  await respond(await handleChannelBetOptButton(JSON.parse(payload.value!)))
})

// /manislack-info

slack.command(/\/manislack-(?:dev-)?info/, async ({ ack, respond }) => {
  await ack()
  const user = await manifold.fetchMe()
  const message = `\
Welcome to Manislack, <https://manifold.markets|:manifold-markets: Manifold Markets> on :slack: Slack!

This bot can track new markets and bets, as well as let you bet with a shared Hack Club Manifold account (<${user.url}|@${user.username}>).

Available commands:

- \`/manislack-info\`: What you're seeing right now!
- \`/manislack-channel-opts\`: Opts in or out a channel from new markets and bets notifications.`
  await respond({
    text: message,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: message } },
      closeButtonBlock,
    ],
  })
})

await slack.start()
