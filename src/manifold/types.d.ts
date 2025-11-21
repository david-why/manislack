// types taken from the API docs: https://docs.manifold.markets/api
// and from the github repo: https://github.com/manifoldmarkets/manifold
// comments (except for these few lines) are preserved from the origin

// ignore the above, i rewrote the types myself because the api ones suck

namespace Manifold {
  // mixins

  type BaseResolvableMixin<
    HasProbability extends boolean = false,
    ResolutionRequired extends boolean = false,
  > =
    | ({
        // this is hard to type so i left it as optional, it exists on
        // resolved contracts AND answers on `!shouldAnswersSumToOne` markets
        resolution?: string
        resolutionTime: number
        resolverId: string
      } & (ResolutionRequired extends true ? { resolution: string } : {}) &
        (HasProbability extends true ? { resolutionProbability: number } : {}))
    | {
        resolution?: never
        resolutionTime?: never
        resolverId?: never
        resolutionProbability?: never
      }

  type LiteContractResolvableMixin<HasProbability extends boolean = false> =
    LiteContractBettableMixin &
      (
        | {
            isResolved: false
          }
        | ({
            isResolved: true
          } & Required<BaseResolvableMixin<HasProbability>>)
      )

  type LiteContractBettableMixin = {
    totalLiquidity: number
    lastBetTime?: number
  }

  type MultiBasedMixin<WithAnswers extends boolean = false> = {
    shouldAnswersSumToOne: boolean // true = mcq, false = set
    addAnswersMode: 'DISABLED' | 'ONLY_CREATOR' | 'ANYONE'
  }

  interface AnswersMixin<T extends Answer> {
    answers: T[]
  }

  interface MidpointMixin {
    midpoint: number
  }

  // lite contract (returned in GET /v0/markets)

  interface LiteContractBase {
    id: string
    slug: string
    // apparently this is not returned in ws responses
    // url: string

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

  // TODO: add bountied question

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

  type LiteBinaryContract = (LiteContractBase &
    LiteContractResolvableMixin<true>) & {
    outcomeType: 'BINARY'
    mechanism: 'cpmm-1'

    pool: { NO: number; YES: number }
    // not in ws
    // probability: number
    p: number
  }

  type LiteContract =
    | LitePollContract
    | LiteMCContract
    | LiteDateContract
    | LiteMultiNumericContract
    | LiteBinaryContract

  // full contracts (returned in GET /v0/market/:id)
  // except the properties only in api or ws responses

  interface ContractBase extends LiteContractBase {
    token: 'MANA'
    description: any // Tiptap JSON format
    groupSlugs?: string[]
  }

  type PollContract = (LitePollContract & ContractBase) & {
    options: { text: string; votes: number }[]
  }

  type MCContract = LiteMCContract & ContractBase & MultiBasedMixin

  type DateContract = LiteDateContract & ContractBase & MultiBasedMixin

  type MultiNumericContract = LiteMultiNumericContract &
    ContractBase &
    MultiBasedMixin

  type BinaryContract = LiteBinaryContract & ContractBase

  type Contract =
    | PollContract
    | MCContract
    | DateContract
    | MultiNumericContract
    | BinaryContract

  // answers

  type Answer = BaseResolvableMixin<true> & {
    id: string
    index: number
    contractId: string
    userId: string
    text: string
    createdTime: number
    totalLiquidity: number
    subsidyPool: number
    isOther: boolean
    probChanges: { day: number; week: number; month: number }
    volume: number
  }

  // bets

  type Bet = {
    id: string
    contractId: string
    answerId?: string
    amount: number
    orderAmount: number // total order, maybe unfilled
    shares: number
    outcome: string
    fees: Fees

    userId: string
    isApi: boolean
    isCancelled: boolean
    isRedemption: boolean // what is this?
    visibility: 'public' | 'unlisted' // i guessed
    silent?: boolean
    replyToCommentId?: string
    betGroupId?: string

    probBefore: number
    probAfter: number
    isFilled: boolean
    fills: Fill[] // TODO

    loanAmount: number

    createdTime: number
    updatedTime?: number

    betId?: string
  } & (
    | {
        limitProb: number
        expiresAt?: number
      }
    | {}
  )

  type Fill = {
    matchedBetId: string | null
    amount: number
    shares: number
    timestamp: number
    fees: Fees
    isSale?: boolean
  }

  // misc types

  interface Fees {
    creatorFee: number
    platformFee: number
    liquidityFee: number
  }

  // api types
  namespace API {
    type LiteContract = Manifold.LiteContract & {
      url: string
    }

    type PollContract = Manifold.PollContract
    type MCContract = Manifold.MCContract & AnswersMixin<Answer>
    type DateContract = Manifold.DateContract &
      AnswersMixin<Answer & MidpointMixin>
    type MultiNumericContract = Manifold.MultiNumericContract &
      AnswersMixin<Answer & MidpointMixin>
    type BinaryContract = Manifold.BinaryContract & {
      probability: number
    }

    type Contract = (
      | PollContract
      | MCContract
      | DateContract
      | MultiNumericContract
      | BinaryContract
    ) & {
      url: string
      textDescription: string
    }

    type Answer = Manifold.Answer & {
      pool: { YES: number; NO: number }
      probability: number
    }
  }

  // ws types
  namespace WS {
    type PollContract = Manifold.PollContract & {
      options: { id: string }[]
      voterVisibility: 'creator' | 'everyone'
    }
    type MCContract = Manifold.MCContract & AnswersMixin<Answer>
    type DateContract = Manifold.DateContract &
      AnswersMixin<Answer & MidpointMixin>
    type MultiNumericContract = Manifold.MultiNumericContract &
      AnswersMixin<Answer & MidpointMixin>
    type BinaryContract = Manifold.BinaryContract & {
      initialProbability: number
      prob: number
      probChanges: { day: number; week: number; month: number }
    }

    type Answer = Manifold.Answer & {
      poolYes: number
      poolNo: number
      prob: number
    }

    type Contract = (
      | PollContract
      | ((MCContract | DateContract | MultiNumericContract | BinaryContract) & {
          subsidyPool: number
        })
    ) & {
      unit?: string // idk what this is
      timezone?: string
      creatorCreatedTime: number
      visibility: 'public' | 'unlisted'
      dailyScore: number
      popularityScore: number
      importanceScore: number
      freshnessScore: number
      conversionScore: number
      uniqueBettorCountDay: number
      viewCount: number
      elasticity: number
      collectedFees: Fees
      boosted: boolean
    }

    interface NewContract {
      contract: Contract
      creator: any
    }

    interface NewBet {
      bets: Bet[]
    }
  }
}
