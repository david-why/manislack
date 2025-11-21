CREATE TABLE IF NOT EXISTS channels (
    id TEXT NOT NULL PRIMARY KEY,
    subscribe_new_markets BOOLEAN NOT NULL DEFAULT FALSE,
    subscribe_new_bets BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS channels_idx_subscribe_new_markets_true ON channels(id) WHERE subscribe_new_markets;
CREATE INDEX IF NOT EXISTS channels_idx_subscribe_new_bets_true ON channels(id) WHERE subscribe_new_bets;

CREATE TABLE IF NOT EXISTS channel_markets (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    channel_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    message_ts TEXT,
    subscribe_new_bets BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (channel_id, market_id),
    FOREIGN KEY (channel_id) REFERENCES channels (id)
);
CREATE INDEX IF NOT EXISTS channel_markets_idx_market_id ON channel_markets(market_id);
