# Passive Aggressive Translator

> Corporate speak decoded. Passive aggression exposed.

**Day 03 / 180 — 180 Days of Building**

You know the feeling — an email lands and something's off. It's polite on the surface but loaded underneath. This extension translates office jargon and passive-aggressive language into plain, honest English. Paste any email or Slack message and get back what they *actually* mean, the subtext, and exactly how to respond.

![Demo](pagt.gif)

---

## What it does

- **What They Actually Mean** — blunt, honest translation with no corporate softening
- **Subtext** — the power dynamics, avoidance tactics, and manipulation explained clearly
- **How to Respond** — a direct, confident reply that doesn't play their game

Works on any text: emails, Slack messages, meeting notes, performance reviews, passive-aggressive Jira comments.

---

## How to use

1. Click the extension icon
2. Paste any email, Slack message, or meeting note into the box
3. Hit **Translate**
4. Get the unfiltered truth in seconds

---

## Setup

### 1. Load the extension
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `passive-aggressive-translator` folder

### 2. Add your API key
Click **⚙** in the popup and paste one of the following:

- **Gemini API key** — free at [aistudio.google.com](https://aistudio.google.com/apikey)
- **OpenRouter API key** — free tier at [openrouter.ai](https://openrouter.ai) (use as fallback if Gemini quota runs out)

Only one key is required. If both are saved, Gemini is used first with OpenRouter as fallback.

---

## Tech stack

- Chrome Extension Manifest V3
- Gemini 2.0 Flash (primary) → OpenRouter fallback
- Vanilla JS — no frameworks, no build step

---

## Part of 180 Days of Building

Shipping one AI Chrome extension every day for 180 days.

Follow along: [@happy_ships](https://x.com/happy_ships)
