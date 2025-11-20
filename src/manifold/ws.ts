import { EventEmitter } from 'events'

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

// outgoing messages

export interface ManifoldMessageBase {
  txid: number
}

export interface ManifoldPingMessage {
  type: 'ping'
}

export interface ManifoldSubscribeMessage {
  type: 'subscribe'
  topics: ManifoldSubscribeTopic[]
}

export interface ManifoldUnsubscribeMessage {
  type: 'unsubscribe'
  topics: ManifoldSubscribeTopic[]
}

export type ManifoldOutgoingMessage =
  | ManifoldPingMessage
  | ManifoldSubscribeMessage
  | ManifoldUnsubscribeMessage

// incoming messages

export interface ManifoldAckMessage {
  type: 'ack'
  success: boolean
}

interface ManifoldBroadcastMessageTempl<
  Topic extends ManifoldSubscribeTopic = any,
> {
  type: 'broadcast'
  topic: Topic
  data: ManifoldBroadcastData[Topic]
}

type ManifoldMessageMap = {
  [K in ManifoldSubscribeTopic]: ManifoldBroadcastMessageTempl<K>
}

export type ManifoldBroadcastMessage =
  ManifoldMessageMap[keyof ManifoldMessageMap]

export type ManifoldBroadcastData = Record<ManifoldSubscribeTopic, unknown> & {
  'global/new-contract': Manifold.WS.NewContract
}

export type ManifoldIncomingMessage = (
  | ManifoldAckMessage
  | ManifoldBroadcastMessage
) &
  ManifoldMessageBase

// websocket stuff

type ManifoldWebSocketEventMap = {
  ack: [txid: number]
  broadcast: [message: ManifoldBroadcastMessage]
}

interface ManifoldWebSocketOptions {
  url?: string
}

const PING_TIMEOUT = 10000
const CONNECT_WAIT = 10000
const RECONNECT_WAIT = 2000 // TODO: exponential backoff

export class ManifoldWebSocket extends EventEmitter<ManifoldWebSocketEventMap> {
  public ws: WebSocket
  private pingInterval?: ReturnType<typeof setInterval>
  private reconnectTimeout?: ReturnType<typeof setTimeout>
  private connectTimeout?: ReturnType<typeof setTimeout>
  private txid = 0
  private topicEmitter = new EventEmitter<{
    [T in ManifoldSubscribeTopic]: [data: ManifoldBroadcastData[T]]
  }>()
  private subscribedEvents = new Set<ManifoldSubscribeTopic>()
  // if needsSync, _syncEvents should be called as soon as the last one finishes and ws is connected
  private needsSync = false
  private isSyncing = false

  private url: string

  constructor(options: ManifoldWebSocketOptions = {}) {
    super()
    this.url = options.url ?? 'wss://api.manifold.markets/ws'
    this._onClose = this._onClose.bind(this)
    this._onOpen = this._onOpen.bind(this)
    this._onError = this._onError.bind(this)
    this._onMessage = this._onMessage.bind(this)
    this._send = this._send.bind(this)
    this._ping = this._ping.bind(this)
    this.ws = this._createWS()
    this.on('broadcast', (message) => {
      this.topicEmitter.emit(message.topic, message.data)
    })
    console.log('ManifoldWebSocket initialized')
  }

  get connected() {
    return this.ws.readyState === WebSocket.OPEN
  }

  subscribe<Topic extends ManifoldSubscribeTopic>(
    topic: Topic,
    listener: (data: ManifoldBroadcastData[Topic]) => unknown,
  ) {
    this.topicEmitter.on(topic, listener as any)
    this._syncEvents()
  }

  unsubscribe<Topic extends ManifoldSubscribeTopic>(
    topic: Topic,
    listener: (data: ManifoldBroadcastData[Topic]) => unknown,
  ) {
    this.topicEmitter.off(topic, listener as any)
    this._syncEvents()
  }

  private async _syncEvents() {
    if (this.isSyncing || !this.connected) {
      this.needsSync = true
      return
    }
    try {
      this.isSyncing = true
      const localEvents = new Set(this.topicEmitter.eventNames())
      const toRemove = this.subscribedEvents.difference(localEvents)
      const toAdd = localEvents.difference(this.subscribedEvents)
      if (toAdd.size) {
        console.log('Adding subscription to', toAdd)
        await this._send({
          type: 'subscribe',
          topics: Array.from(toAdd),
        })
        toAdd.forEach(this.subscribedEvents.add.bind(this.subscribedEvents))
        console.log('Subscription added')
      }
      if (toRemove.size) {
        console.log('Removing subscription to', toRemove)
        await this._send({
          type: 'unsubscribe',
          topics: Array.from(toRemove),
        })
        toRemove.forEach(
          this.subscribedEvents.delete.bind(this.subscribedEvents),
        )
        console.log('Subscriptions removed')
      }
      this.needsSync = false
    } finally {
      this.isSyncing = false
      if (this.needsSync) {
        this._syncEvents()
      }
    }
  }

  private _createWS() {
    const ws = new WebSocket(this.url)
    ws.addEventListener('close', this._onClose)
    ws.addEventListener('open', this._onOpen)
    ws.addEventListener('error', this._onError)
    ws.addEventListener('message', this._onMessage)
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout)
    }
    this.connectTimeout = setTimeout(() => {
      this.connectTimeout = undefined
      console.log(`WebSocket not open in ${CONNECT_WAIT}ms, reconnecting`)
      this._reconnect()
    }, CONNECT_WAIT)
    return ws
  }

  private async _send(message: ManifoldOutgoingMessage) {
    const txid = this.txid++
    const payload = Object.assign({ txid }, message)

    this.ws.send(JSON.stringify(payload))

    return new Promise<void>((resolve, reject) => {
      const handler = (ackTxid: number) => {
        if (txid === ackTxid) {
          this.off('ack', handler)
          clearTimeout(timeout)
          resolve()
        }
      }

      const timeout = setTimeout(() => {
        console.warn(
          `Server did not ack message ${txid} in ${PING_TIMEOUT}ms, reconnecting`,
        )
        this.ws.close(1000, 'Message timeout')
        this.off('ack', handler)
        reject(new Error('Message timeout'))
      }, PING_TIMEOUT)

      this.on('ack', handler)
    })
  }

  private async _ping() {
    console.log('Sending websocket ping at', new Date())
    const start = Date.now()
    try {
      await this._send({ type: 'ping' })
    } catch {
      // it's reconnecting
      return
    }
    const end = Date.now()
    console.log(`Received pong in ${end - start}ms`)
  }

  // websocket events

  private _onClose(ev: CloseEvent) {
    const ws = ev.target as WebSocket
    if (ws != this.ws) return
    console.log('WebSocket was closed with code', ev.code, ev.reason)
    ws.removeEventListener('close', this._onClose)
    ws.removeEventListener('open', this._onOpen)
    ws.removeEventListener('error', this._onError)
    ws.removeEventListener('message', this._onMessage)
    this._reconnect()
  }
  private _onOpen(ev: Event) {
    const ws = ev.target as WebSocket
    if (ws != this.ws) return
    console.log('WebSocket connected')
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout)
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    this.pingInterval = setInterval(this._ping, 30000)
    if (this.needsSync) {
      this._syncEvents()
    }
  }
  private _onError(ev: Event) {
    const ws = ev.target as WebSocket
    if (ws != this.ws) return
    console.log('WebSocket error:', ev)
    this._reconnect()
  }
  private _onMessage(ev: Bun.MessageEvent<string>) {
    const payload = JSON.parse(ev.data) as ManifoldIncomingMessage
    if (payload.type === 'ack') {
      this.emit('ack', payload.txid)
    } else if (payload.type === 'broadcast') {
      this.emit('broadcast', payload)
    }
  }

  private _reconnect() {
    if (this.reconnectTimeout) return
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout)
    }
    if (this.ws.readyState <= WebSocket.OPEN) {
      try {
        this.ws.close(1000, 'Reconnect requested')
      } catch {}
    }
    if (this.subscribedEvents.size) {
      this.needsSync = true
    }
    this.subscribedEvents.clear()
    this.reconnectTimeout = setTimeout(() => {
      console.log('Reconnecting...')
      this.reconnectTimeout = undefined
      this.ws = this._createWS()
    }, RECONNECT_WAIT)
  }
}
