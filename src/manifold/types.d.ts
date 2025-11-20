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

  type GroupMixin = {
    groupSlugs?: string[]
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

  // half-full contracts (returned in GET /v0/market/:id)

  interface ContractBase extends LiteContractBase {
    token: 'MANA'
    description: any // Tiptap JSON format
    textDescription: string
  }

  type PollContract = (LitePollContract & ContractBase & GroupMixin) & {
    options: { text: string; votes: number }[]
  }

  type MCContract = (LiteMCContract & ContractBase & GroupMixin) & {
    shouldAnswersSumToOne: boolean // true = mcq, false = set
    addAnswersMode: 'DISABLED' | 'ONLY_CREATOR' | 'ANYONE'
    answers: Answer[]
  }

  // FIXME: manifold api bug? answers not returned for date & numeric
  type DateContract = LiteDateContract & ContractBase

  type MultiNumericContract = LiteMultiNumericContract &
    ContractBase &
    GroupMixin

  type BinaryContract = LiteBinaryContract & ContractBase

  type Contract =
    | PollContract
    | MCContract
    | DateContract
    | MultiNumericContract
    | BinaryContract

  // answers

  interface Answer {
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
}
