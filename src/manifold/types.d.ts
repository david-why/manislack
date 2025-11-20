// types taken from the API docs: https://docs.manifold.markets/api
// and from the github repo: https://github.com/manifoldmarkets/manifold
// comments (except for these few lines) are preserved from the origin

// ignore the above, i rewrote the types myself because the api ones suck

namespace Manifold {
  // mixins

  type BaseResolvableMixin<HasProbability extends boolean = false> = {
    resolution?: string
    resolutionTime?: number
    resolverId?: string
  } & (HasProbability extends true ? { resolutionProbability?: number } : {})

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

  interface MultiBasedMixin<T extends Answer> {
    shouldAnswersSumToOne: boolean // true = mcq, false = set
    addAnswersMode: 'DISABLED' | 'ONLY_CREATOR' | 'ANYONE'
    answers: T[]
  }

  // lite contract (returned in GET /v0/markets)

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
    probability: number
    p: number
  }

  type LiteContract =
    | LitePollContract
    | LiteMCContract
    | LiteDateContract
    | LiteMultiNumericContract
    | LiteBinaryContract

  // full contracts (returned in GET /v0/market/:id)

  interface ContractBase extends LiteContractBase {
    token: 'MANA'
    description: any // Tiptap JSON format
    textDescription: string
    groupSlugs?: string[]
  }

  type PollContract = (LitePollContract & ContractBase) & {
    options: { text: string; votes: number }[]
  }

  type MCContract = LiteMCContract & ContractBase & MultiBasedMixin<Answer>

  type DateContract = LiteDateContract &
    ContractBase &
    MultiBasedMixin<MidpointAnswer>

  type MultiNumericContract = LiteMultiNumericContract &
    ContractBase &
    MultiBasedMixin<MidpointAnswer>

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
    pool: { YES: number; NO: number }
    probability: number
  }

  type MidpointAnswer = Answer & {
    midpoint: number
  }
}
