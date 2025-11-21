import { sql } from 'bun'

export interface Channel {
  id: string
  subscribe_new_markets: boolean
  subscribe_new_bets: boolean
}

export interface ChannelMarket {
  id: number
  channel_id: string
  market_id: string
  message_ts: string | null
}

export async function getGloballySubscribedChannels() {
  return await sql<
    Channel[]
  >`SELECT * FROM channels WHERE subscribe_new_markets`
}

export async function addChannelMarket(obj: Omit<ChannelMarket, 'id'>) {
  await sql`INSERT INTO channel_markets ${sql(obj)}`
}

export async function getChannelsForMarket(marketId: string) {
  return await sql<
    ChannelMarket[]
  >`SELECT * FROM channel_markets WHERE market_id = ${marketId}`
}
