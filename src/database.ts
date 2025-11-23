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
  subscribe_new_bets: boolean
}

export async function getGloballySubscribedChannels() {
  return await sql<
    Channel[]
  >`SELECT * FROM channels WHERE subscribe_new_markets`
}

export async function getChannel(id: string) {
  return (await sql<Channel[]>`SELECT * FROM channels WHERE id = ${id}`)[0]
}

export async function addChannel(
  channel: Partial<Channel> & Pick<Channel, 'id'>,
) {
  return (
    await sql<[Channel]>`INSERT INTO channels ${sql(channel)} RETURNING *`
  )[0]
}

export async function updateChannel(channel: Channel) {
  await sql`UPDATE channels SET ${sql(channel)} WHERE id = ${channel.id}`
}

export async function addChannelMarket(obj: Omit<ChannelMarket, 'id'>) {
  await sql`INSERT INTO channel_markets ${sql(obj)}`
}

export async function getChannelMarket(channelId: string, marketId: string) {
  return (
    await sql<
      ChannelMarket[]
    >`SELECT * FROM channel_markets WHERE channel_id = ${channelId} AND market_id = ${marketId}`
  )[0]
}

export async function getChannelsForMarket(marketId: string) {
  return await sql<
    ChannelMarket[]
  >`SELECT * FROM channel_markets WHERE market_id = ${marketId}`
}

export async function updateChannelMarket(obj: ChannelMarket) {
  const data = { ...obj, id: undefined }
  await sql`UPDATE channel_markets SET ${sql(data)} WHERE id = ${obj.id}`
}
