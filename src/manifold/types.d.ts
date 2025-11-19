// types taken from the API docs: https://docs.manifold.markets/api
// and from the github repo: https://github.com/manifoldmarkets/manifold
// comments (except for these few lines) are preserved from the origin

namespace Manifold {
  type User = {
    id: string // user's unique id
    createdTime: number

    name: string // display name, may contain spaces
    username: string // username, used in urls
    url: string // link to user's profile
    avatarUrl?: string

    bio?: string
    bannerUrl?: string
    website?: string
    twitterHandle?: string
    discordHandle?: string

    isBot?: boolean
    isAdmin?: boolean // is Manifold team
    isTrustworthy?: boolean // is Moderator
    isBannedFromPosting?: boolean
    userDeleted?: boolean

    // Note: the following are here for convenience only and may be removed in the future.
    balance: number
    totalDeposits: number
    lastBetTime?: number
    currentBettingStreak?: number
  }

  type DisplayUser = {
    id: string
    name: string // display name, may include spaces
    username: string // username, used in urls
    avatarUrl?: string
  }

  type PortfolioMetrics = {
    investmentValue: number
    cashInvestmentValue: number
    balance: number
    cashBalance: number
    spiceBalance: number
    totalDeposits: number
    totalCashDeposits: number
    loanTotal: number
    timestamp: number // Unix timestamp in milliseconds
    profit?: number
    userId: string
  }

  type LivePortfolioMetrics = PortfolioMetrics & {
    dailyProfit: number
  }

  // Information about a market, but without bets or comments
  type LiteMarket = {
    // Unique identifer for this market
    id: string

    // Attributes about the creator
    creatorId: string
    creatorUsername: string
    creatorName: string
    creatorAvatarUrl?: string

    // Market atributes
    createdTime: number // When the market was created
    closeTime?: number // Min of creator's chosen date, and resolutionTime
    question: string

    // Note: This url always points to https://manifold.markets, regardless of what instance the api is running on.
    // This url includes the creator's username, but this doesn't need to be correct when constructing valid URLs.
    //   i.e. https://manifold.markets/Austin/test-market is the same as https://manifold.markets/foo/test-market
    url: string

    outcomeType: string // BINARY, FREE_RESPONSE, MULTIPLE_CHOICE, NUMERIC, PSEUDO_NUMERIC, BOUNTIED_QUESTION, POLL, or ...
    mechanism: string // dpm-2, cpmm-1, or cpmm-multi-1

    probability: number
    pool: { outcome: number } // For CPMM markets, the number of shares in the liquidity pool. For DPM markets, the amount of mana invested in each answer.
    p?: number // CPMM markets only, probability constant in y^p * n^(1-p) = k
    totalLiquidity?: number // CPMM markets only, the amount of mana deposited into the liquidity pool

    value?: number // PSEUDO_NUMERIC markets only, the current market value, which is mapped from probability using min, max, and isLogScale.
    min?: number // PSEUDO_NUMERIC markets only, the minimum resolvable value
    max?: number // PSEUDO_NUMERIC markets only, the maximum resolvable value
    isLogScale?: bool // PSEUDO_NUMERIC markets only, if true `number = (max - min + 1)^probability + minstart - 1`, otherwise `number = min + (max - min) * probability`

    volume: number
    volume24Hours: number

    isResolved: boolean
    resolutionTime?: number
    resolution?: string
    resolutionProbability?: number // Used for BINARY markets resolved to MKT
    uniqueBettorCount: number

    lastUpdatedTime?: number
    lastBetTime?: number

    token?: 'MANA' | 'CASH' // mana or prizecash question
    siblingContractId?: string // id of the prizecash or mana version of this question that you get to by toggling.
  }

  // A complete market, along with answers (for free response markets)
  type FullMarket = LiteMarket & {
    answers?: Answer[] // multi markets only
    shouldAnswersSumToOne?: boolean // multi markets only, whether answers are dependant (that is add up to 100%, typically used when only one answer should win). Always true for dpm-2 multiple choice and free response
    addAnswersMode?: 'ANYONE' | 'ONLY_CREATOR' | 'DISABLED' // multi markets only, who can add answers

    options?: { text: string; votes: number }[] // poll only

    totalBounty?: number // bounty only
    bountyLeft?: number // bounty only

    description: JSONContent // Rich text content. See https://tiptap.dev/guide/output#option-1-json
    textDescription: string // string description without formatting, images, or embeds
    coverImageUrl?: string
    groupSlugs?: string[] // topics tagged in this market
  }

  // A single position in a market
  type ContractMetric = {
    contractId: string
    from:
      | {
          // includes, day, week,month
          [period: string]: {
            profit: number
            profitPercent: number
            invested: number
            prevValue: number
            value: number
          }
        }
      | undefined
    hasNoShares: boolean
    hasShares: boolean
    hasYesShares: boolean
    invested: number
    loan: number
    maxSharesOutcome: string | null
    payout: number
    profit: number
    profitPercent: number
    totalShares: {
      [outcome: string]: number
    }
    userId: string
    userUsername: string
    userName: string
    userAvatarUrl: string
    lastBetTime: number
  }

  type Bet = {
    id: string
    userId: string

    contractId: string
    answerId?: string // For multi-binary contracts
    createdTime: number
    updatedTime?: number // Generated on supabase, useful for limit orders

    amount: number // bet size; negative if SELL bet
    loanAmount?: number
    outcome: string
    shares: number // dynamic parimutuel pool weight or fixed ; negative if SELL bet

    probBefore: number
    probAfter: number

    fees: Fees

    isApi?: boolean // true if bet was placed via API

    isRedemption: boolean
    /** @deprecated */
    challengeSlug?: string

    replyToCommentId?: string
    betGroupId?: string // Used to group buys on MC sumsToOne contracts
  } & Partial<LimitProps>

  type LimitProps = {
    orderAmount: number // Amount of mana in the order
    limitProb: number // [0, 1]. Bet to this probability.
    isFilled: boolean // Whether all of the bet amount has been filled.
    isCancelled: boolean // Whether to prevent any further fills.
    // A record of each transaction that partially (or fully) fills the orderAmount.
    // I.e. A limit order could be filled by partially matching with several bets.
    // Non-limit orders can also be filled by matching with multiple limit orders.
    fills: fill[]
    expiresAt?: number // ms since epoch.
    silent?: boolean // New default quick limit order type. API bets cannot be silent.
  }

  type fill = {
    // The id the bet matched against, or null if the bet was matched by the pool.
    matchedBetId: string | null
    amount: number
    shares: number
    timestamp: number
    fees?: Fees
    // If the fill is a sale, it means the matching bet has shares of the same outcome.
    // I.e. -fill.shares === matchedBet.shares
    isSale?: boolean
  }

  type Answer = {
    id: string
    index: number // Order of the answer in the list
    contractId: string
    userId: string
    text: string
    createdTime: number
    color?: string // Hex color override in UI

    // Mechanism props
    poolYes: number // YES shares
    poolNo: number // NO shares
    prob: number // Computed from poolYes and poolNo.
    totalLiquidity: number // for historical reasons, this the total subsidy amount added in M
    subsidyPool: number // current value of subsidy pool in M
    volume: number // current volume of the answer in M

    // Is this 'Other', the answer that represents all other answers, including answers added in the future.
    isOther?: boolean

    resolution?: resolution
    resolutionTime?: number
    resolutionProbability?: number
    resolverId?: string

    probChanges: {
      day: number
      week: number
      month: number
    }

    loverUserId?: string
    imageUrl?: string
    shortText?: string
    midpoint?: number
  }

  type JSONContent = any
}
