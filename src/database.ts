import { sql } from 'bun'

export interface Channel {
  id: string
  subscribe_new_markets: boolean
}

export async function getGloballySubscribedChannels() {
  return await sql<
    Channel[]
  >`SELECT * FROM channels WHERE subscribe_new_markets`
}
