# manislack

A Slack bot for subscribing to new markets and bets on [Manifold Markets](https://manifold.markets) and place bets using a shared account. Made for the [Hack Club Slack](https://hackclub.com/slack)!

## Usage

You can use the bot in the public [#manifold-demo](https://hackclub.slack.com/archives/C0A05FLAM7A) channel, or add the bot to your own channels!

To use in #manifold-demo:

1. Find a market you find interesting in the channel.
2. Click on the `YES` or `NO` buttons to place a bet on an option.
3. Enter the amount of mana you'd like to bet.
   - This is a _shared account_, so please don't go crazy with your bets!
4. Click "Place bet".
5. This should automatically update the info shown on the message!

To use in your own channel:

1. Invite @Manislack to your channel.
2. Use the `/manislack-channel-opts` command to configure which updates you'd like to receive: new contracts and/or new bets on those contracts.

## Commands

- `/manislack-info`: Learn how to use Manislack.
- `/manislack-channel-opts [#channel]`: Manages the subscriptions for a channel.
- `/manislack-market <url|slug|id>`: Fetch a single market into this channel.

## Tech stack

This project is built with [Bun](https://bun.com), the all-in-one JS/TS toolkit. I used the `@slack/bolt` library for interfacing with Slack, but I wrote the framework for interfacing with Manifold myself.
