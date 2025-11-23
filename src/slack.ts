import type { App, RespondFn, SlashCommand } from '@slack/bolt'
import type { KnownBlock } from '@slack/types'
import { generateChannelOptsBlocks, generateContractBlocks } from './blocks'
import {
  getChannel,
  addChannelMarket,
  getChannelsForMarket,
  getGloballySubscribedChannels,
  type Channel,
  type ChannelMarket,
  addChannel,
  updateChannel,
} from './database'
import type { Client } from './manifold/api'
import { trimTextEllipsis } from './utils'

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
      handleNewContractForChannel(slack, contract, c, blocks),
    ),
  )
}

async function handleNewContractForChannel(
  slack: App,
  contract: Manifold.WS.Contract,
  channel: Channel,
  blocks: KnownBlock[],
) {
  const message = await slack.client.chat.postMessage({
    channel: channel.id,
    text: `New market opened: ${contract.question}`,
    blocks,
  })

  if (!message.ts) {
    console.warn('No ts provided after message posted', message)
  } else {
    await addChannelMarket({
      channel_id: channel.id,
      market_id: contract.id,
      message_ts: message.ts,
      subscribe_new_bets: channel.subscribe_new_bets,
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
      handleNewBetForChannel(slack, manifold, bets, market, user, o),
    ),
  )
}

async function handleNewBetForChannel(
  slack: App,
  manifold: Client,
  bets: Manifold.Bet[],
  market: Manifold.API.Contract,
  user: Manifold.API.User,
  channel: ChannelMarket,
) {
  if (!channel.subscribe_new_bets) return

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
    channel: channel.channel_id,
    thread_ts: channel.message_ts || undefined,
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

// events from slack

export interface CreateBetData {
  outcome: 'YES' | 'NO'
  contractId: string
  answerId?: string
}

export async function handleCreateBetButton(
  slack: App,
  manifold: Client,
  trigger_id: string,
  payload: CreateBetData,
  respond: RespondFn,
) {
  const [contract, me] = await Promise.all([
    manifold.fetchMarket(payload.contractId),
    manifold.fetchMe(),
  ])

  if (contract.closeTime && contract.closeTime < Date.now()) {
    return respond({
      replace_original: false,
      text: ':x: This question is closed!',
    })
  }

  const answer = (
    contract as Manifold.AnswersMixin<Manifold.API.Answer>
  ).answers?.find((a) => a.id === payload.answerId)

  const title = payload.answerId
    ? `Bet ${payload.outcome} on ${answer?.text}`
    : `Place a ${payload.outcome} bet`

  const balance = Math.floor(me.balance)

  await slack.client.views.open({
    trigger_id: trigger_id,
    view: {
      type: 'modal',
      callback_id: 'bet-modal',
      private_metadata: JSON.stringify(payload),
      title: { type: 'plain_text', text: title },
      submit: { type: 'plain_text', text: 'Place bet' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: 'You are about to place a bet on ',
                },
                {
                  type: 'link',
                  text: contract.question,
                  url: contract.url,
                  style: {
                    bold: true,
                  },
                },
                {
                  type: 'text',
                  text: '.',
                },
              ],
            },
          ],
        },
        {
          type: 'input',
          block_id: 'amount',
          element: {
            type: 'number_input',
            is_decimal_allowed: false,
            initial_value: '10',
            min_value: '1',
            max_value: balance.toString(),
            action_id: 'value',
          },
          label: {
            type: 'plain_text',
            text: ':manifold-mana: Bet amount',
            emoji: true,
          },
          hint: {
            type: 'plain_text',
            text: `You have :manifold-mana:${balance}.`,
            emoji: true,
          },
          optional: false,
        },
      ],
    },
  })
}

export interface ChannelOptData {
  id: string
  value: boolean
}

export async function handleChannelMarketOptButton(data: ChannelOptData) {
  let obj = await getChannel(data.id)
  if (!obj) {
    obj = await addChannel({
      id: data.id,
      subscribe_new_markets: data.value,
    })
  } else {
    obj.subscribe_new_markets = data.value
    await updateChannel(obj)
  }
  return {
    text: 'Manage channel opts',
    blocks: generateChannelOptsBlocks(obj),
  }
}

export async function handleChannelBetOptButton(data: ChannelOptData) {
  let obj = await getChannel(data.id)
  if (!obj) {
    obj = await addChannel({
      id: data.id,
      subscribe_new_bets: data.value,
    })
  } else {
    obj.subscribe_new_bets = data.value
    await updateChannel(obj)
  }
  return {
    text: 'Manage channel opts',
    blocks: generateChannelOptsBlocks(obj),
  }
}

// slash commands

export async function handleChannelOptsCommand(
  slack: App,
  payload: SlashCommand,
  respond: RespondFn,
) {
  let channelId: string
  if (payload.text.trim()) {
    const match = payload.text.trim().match(/^<#(C[0-9A-Z]+)\|.*>$/)
    if (!match) {
      return respond(
        'Please provide a valid channel in the command argument, or remove the argument to manage the current channel!',
      )
    }
    channelId = match[1]!
  } else {
    channelId = payload.channel_id
  }

  let hasPerms: boolean
  try {
    const { channel } = await slack.client.conversations.info({
      channel: channelId,
    })
    hasPerms = channel?.creator === payload.user_id || !!channel?.is_im
  } catch (e) {
    console.error('Failed to fetch channel, is it private?', e)
    return respond(
      `The channel provided does not exist or is private. Please add me to <#${channelId}> and try again!`,
    )
  }

  if (!hasPerms) {
    return respond('Only the channel creator can modify channel opts!')
  }

  const obj: Channel = (await getChannel(channelId)) ?? {
    id: channelId,
    subscribe_new_bets: false,
    subscribe_new_markets: false,
  }

  return respond({
    text: 'Manage channel opts',
    blocks: generateChannelOptsBlocks(obj),
  })
}
