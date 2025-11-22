import type { App } from '@slack/bolt'
import type { KnownBlock } from '@slack/types'
import { generateContractBlocks } from './blocks'
import {
  addChannelMarket,
  getChannelsForMarket,
  getGloballySubscribedChannels,
} from './database'
import type { Client } from './manifold/api'

const { CHANNEL_LOGS } = process.env

export async function handleNewContract(
  slack: App,
  manifold: Client,
  { contract, creator }: Manifold.WS.NewContract,
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
            {
              type: 'rich_text_preformatted',
              elements: [{ type: 'text', text: JSON.stringify(creator) }],
            },
          ],
        },
      ],
    })
  }

  const channels = await getGloballySubscribedChannels()

  const fullContract = await manifold.fetchMarket(contract.id)
  const blocks = generateContractBlocks(fullContract)

  await Promise.all(
    channels.map((c) =>
      handleNewContractForChannel(slack, contract, c.id, blocks),
    ),
  )
}

async function handleNewContractForChannel(
  slack: App,
  contract: Manifold.WS.Contract,
  channel: string,
  blocks: KnownBlock[],
) {
  const message = await slack.client.chat.postMessage({
    channel: channel,
    text: `New market opened: ${contract.question}`,
    blocks,
  })

  if (!message.ts) {
    console.warn('No ts provided after message posted', message)
  } else {
    await addChannelMarket({
      channel_id: channel,
      market_id: contract.id,
      message_ts: message.ts,
    })
  }
}

export async function handleNewBet(
  slack: App,
  manifold: Client,
  { bets }: Manifold.WS.NewBet,
) {
  const userBets = bets.filter((b) => !b.isRedemption)
  const bet = userBets[0]
  if (!bet) return

  if (CHANNEL_LOGS) {
    slack.client.chat.postMessage({
      channel: CHANNEL_LOGS,
      text: 'New bet placed',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: 'New bet placed' },
        },
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_preformatted',
              elements: [{ type: 'text', text: JSON.stringify(bets) }],
            },
          ],
        },
      ],
    })
  }

  const { contractId, userId } = bet

  const [market, user] = await Promise.all([
    manifold.fetchMarket(contractId),
    manifold.fetchUser(userId),
  ])

  const channelMarkets = await getChannelsForMarket(contractId)

  await Promise.all(
    channelMarkets.map((o) =>
      handleNewBetForChannel(
        slack,
        manifold,
        bets,
        market,
        user,
        o.channel_id,
        o.message_ts || undefined,
      ),
    ),
  )
}

async function handleNewBetForChannel(
  slack: App,
  manifold: Client,
  bets: Manifold.Bet[],
  market: Manifold.API.Contract,
  user: Manifold.API.User,
  channel: string,
  ts?: string,
) {
  const bet = bets.find((b) => !b.isRedemption)!

  let choiceMessage: string
  if (bet.answerId) {
    const { answers } = market as Manifold.AnswersMixin<Manifold.API.Answer>
    const answer = answers.find((a) => a.id === bet.answerId)
    if (!answer) {
      console.warn('Could not find answer with this ID', market.id, bet)
      return
    }
    choiceMessage = `*${bet.outcome}* for *${answer.text}*`
  } else {
    choiceMessage = `*${bet.outcome}*`
  }

  let message: string
  if (bet.limitProb) {
    message = `A :manifold-mana:${bet.orderAmount} bet was placed on ${choiceMessage} at ${Math.round(bet.limitProb * 100)}% by *${user.name}*`
  } else {
    message = `A :manifold-mana:${bet.orderAmount} bet was placed on ${choiceMessage} by *${user.name}*`
  }

  await slack.client.chat.postMessage({
    channel,
    thread_ts: ts,
    text: message,
  })
}

export async function handleUpdatedContract(
  slack: App,
  manifold: Client,
  { contract }: Manifold.WS.UpdatedContract,
) {
  const fullContract = await manifold.fetchMarket(contract.id)
  const blocks = generateContractBlocks(fullContract)

  const channelMarkets = await getChannelsForMarket(contract.id)
  await Promise.all(
    channelMarkets
      .filter((m) => m.message_ts)
      .map((m) =>
        slack.client.chat.update({
          channel: m.channel_id,
          ts: m.message_ts!,
          blocks,
        }),
      ),
  )
}
