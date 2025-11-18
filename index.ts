import { ManifoldWebSocket } from './src/manifold/ws'

const conn = new ManifoldWebSocket()

conn.subscribe('global/new-contract', (bet) => {
  console.log(bet)
})

await new Promise(() => {})
