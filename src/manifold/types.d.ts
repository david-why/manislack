// types taken from the API docs: https://docs.manifold.markets/api
// and from the github repo: https://github.com/manifoldmarkets/manifold
// comments (except for these few lines) are preserved from the origin

// ignore the above, i rewrote the types myself because the api ones suck

namespace Manifold {
  // mixins

  type LiteContractResolvableMixin = LiteContractBettableMixin &
    (
      | {
          isResolved: false
        }
      | {
          isResolved: true
          resolution: string
          resolutionTime: number
          resolverId: string
        }
    )

  type LiteContractBettableMixin = {
    totalLiquidity: number
    lastBetTime?: number
  }

  interface LiteContractBase {
    id: string
    slug: string
    url: string

    question: string

    volume: number
    volume24Hours: number
    isResolved: boolean
    uniqueBettorCount: number

    creatorId: string
    creatorUsername: string
    creatorName: string
    creatorAvatarUrl: string

    closeTime?: number
    createdTime: number
    lastUpdatedTime: number
    lastCommentTime?: number
  }

  type LitePollContract = LiteContractBase & {
    outcomeType: 'POLL'
    mechanism: 'none'
  }

  type LiteMCContract = (LiteContractBase & LiteContractResolvableMixin) & {
    outcomeType: 'MULTIPLE_CHOICE'
    mechanism: 'cpmm-multi-1'
  }

  type LiteDateContract = (LiteContractBase & LiteContractResolvableMixin) & {
    outcomeType: 'DATE'
    mechanism: 'cpmm-multi-1'
  }

  type LiteMultiNumericContract = (LiteContractBase &
    LiteContractResolvableMixin) & {
    outcomeType: 'MULTI_NUMERIC'
    mechanism: 'cpmm-multi-1'
  }

  type LiteBinaryContract = (LiteContractBase & LiteContractResolvableMixin) & {
    outcomeType: 'BINARY'
    mechanism: 'cpmm-1'

    pool: { NO: number; YES: number }
    probability: number
    p: number
  }

  type LiteContract =
    | LitePollContract
    | LiteMCContract
    | LiteDateContract
    | LiteMultiNumericContract
    | LiteBinaryContract
}
