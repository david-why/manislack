export interface ClientOptions {
  url?: string
}

export class Client {
  private url: string

  constructor(options: ClientOptions = {}) {
    this.url = options.url ?? 'https://api.manifold.markets'
  }

  async fetchMarket(id: string) {
    return (await fetch(`${this.url}/v0/market/${id}`).then((r) =>
      r.json(),
    )) as Manifold.API.Contract
  }

  async fetchUser(id: string) {
    return (await fetch(`${this.url}/v0/user/by-id/${id}`).then((r) =>
      r.json(),
    )) as Manifold.API.User
  }
}
