export type ManifoldSubscribeTopic =
  | 'global/new-bet'
  | 'global/new-contract'
  | 'global/new-comment'
  | 'global/new-subsidy'
  | 'global/updated-contract'
  | `contract/${number}`
  | `contract/${number}/new-bet`
  | `contract/${number}/new-comment`
  | `contract/${number}/new-subsidy`
  | `contract/${number}/new-answer`
  | `contract/${number}/updated-answers`
  | `contract/${number}/orders`
  | `contract/${number}/chart-annotation`
  | `contract/${number}/user-metrics/${number}`
  | `user/${number}`
  | `answer/${number}/update`
  | 'tv_schedule'

export interface ManifoldMessageBase {
  txid: number
}

export interface ManifoldPingMessage extends ManifoldMessageBase {
  type: 'ping'
}

export interface ManifoldSubscribeMessage extends ManifoldMessageBase {
  type: 'subscribe'
  topics: ManifoldSubscribeTopic[]
}

export interface ManifoldUnsubscribeMessage extends ManifoldMessageBase {
  type: 'unsubscribe'
  topics: ManifoldSubscribeTopic[]
}

export type ManifoldOutgoingMessage =
  | ManifoldPingMessage
  | ManifoldSubscribeMessage
  | ManifoldUnsubscribeMessage

export class ManifoldWebSocket {
  public ws: WebSocket
  private wsInterval?: ReturnType<typeof setInterval>
  private txid = 0

  constructor() {
    this._onClose = this._onClose.bind(this)
    this._onOpen = this._onOpen.bind(this)
    this._onError = this._onError.bind(this)
    this._onMessage = this._onMessage.bind(this)
    this.ws = this._createWS()
  }

  private _createWS() {
    const ws = new WebSocket('wss://api.manifold.markets/ws')
    ws.addEventListener('close', this._onClose)
    ws.addEventListener('open', this._onOpen)
    ws.addEventListener('error', this._onError)
    ws.addEventListener('message', this._onMessage)
    return ws
  }

  private async _send(message: Omit<ManifoldOutgoingMessage, 'txid'>) {
    this.ws.send(JSON.stringify(message))
    return new Promise((resolve, reject) => {

    })
  }

  private async _ping() {
    console.log('Sending websocket ping...')
    return this._send({ type: 'ping' })
  }

  // websocket events

  private _onClose(ev: CloseEvent) {
    const ws = ev.target as WebSocket
    console.log('ws closed', ev.code, ev.reason, ev.wasClean)
    ws.removeEventListener('close', this._onClose)
    ws.removeEventListener('open', this._onOpen)
    ws.removeEventListener('error', this._onError)
    ws.removeEventListener('message', this._onMessage)
  }
  private _onOpen(ev: Event) {
    console.log('ws opened')
    if (this.wsInterval) {
      clearInterval(this.wsInterval)
    }
    this.wsInterval = setInterval(this._ping, 30000)
  }
  private _onError(ev: Event) {
    console.log('ws error:', ev.target, ev)
  }
  private _onMessage(ev: Bun.MessageEvent) {
    console.log('message:', ev.data)
  }
}
