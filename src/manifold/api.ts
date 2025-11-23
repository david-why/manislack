export interface ClientOptions {
  url?: string
  token?: string
}

function createError(message: string, data: {}) {
  const err = new Error(message)
  return Object.assign(err, data)
}

export class Client {
  private url: string
  private token?: string

  constructor(options: ClientOptions = {}) {
    this.url = options.url ?? 'https://api.manifold.markets'
    this.token = options.token
  }

  private async _request<T>(
    endpoint: string,
    options: { auth?: boolean; body?: any; method?: string } = {},
  ) {
    if (options.auth && !this.token) {
      throw new Error('Authentication required')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (options.auth) {
      headers.Authorization = `Key ${this.token}`
    }

    const res = await fetch(`${this.url}${endpoint}`, {
      method: options.method ?? 'GET',
      body: options.body ? JSON.stringify(options.body) : null,
      headers,
    })
    if (!res.ok) {
      throw createError(
        `API ${options.method ?? 'GET'} request to ${endpoint} failed with status code ${res.status}`,
        { data: await res.text() },
      )
    }
    return (await res.json()) as T
  }

  async fetchMarket(id: string) {
    return this._request<Manifold.API.Contract>(`/v0/market/${id}`)
  }

  async fetchMarketBySlug(slug: string) {
    return this._request<Manifold.API.Contract>(`/v0/slug/${slug}`)
  }

  async fetchUser(id: string) {
    return this._request<Manifold.API.User>(`/v0/user/by-id/${id}`)
  }

  async fetchMe() {
    return this._request<Manifold.API.User>('/v0/me', { auth: true })
  }

  async placeBet(bet: Manifold.API.PlaceBetRequest) {
    return this._request(`/v0/bet`, { method: 'POST', body: bet, auth: true })
  }
}
