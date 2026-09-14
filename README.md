# TrendPump 🚀

### Autonomous AI-Driven Memecoin Launchpad on GenLayer

[![Live dApp](https://img.shields.io/badge/Live%20dApp-genfun.arcstones.xyz-green)](https://genfun.arcstones.xyz/)
[![GenLayer StudioNet](https://img.shields.io/badge/GenLayer-StudioNet%200xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693-blue)](https://explorer-studio.genlayer.com/address/0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693)
[![Tests](https://img.shields.io/badge/GenVM%20Tests-10%2F10%20Passing-brightgreen)](https://github.com/Alicepoltora/trend-pump)
[![Fair Launch](https://img.shields.io/badge/Fair%20Launch-100%25%20Zero--Dev-orange)](https://github.com/Alicepoltora/trend-pump)

**TrendPump** is the world's first autonomous, zero-human memecoin launchpad. Instead of human developers launching tokens, front-running buyers, and dumping liquidity, the **GenLayer Intelligent Contract itself acts as the creator, validator, and market maker**.

---

## ⚡ Key Innovations

1. **Autonomous Social Radar**: Intelligent Contract monitors influential accounts (@elonmusk, @vitalikbuterin, breaking news feeds) using `gl.nondet.web.render()`.
2. **Validator AI Virality Consensus**: GenLayer validators independently evaluate tweet virality using LLM prompts inside GenVM (`gl.nondet.exec_prompt()`). When consensus is reached (score > 70), the contract autonomously generates a catchy ticker (e.g. `$MARS`), token name, lore, and initializes a 100% fair-launch bonding curve.
3. **Mathematical Bonding Curve**: Pure on-chain mathematical linear pricing curve:
   73264\text{Cost}(\Delta s) = \Delta s \cdot \text{BasePrice} + \frac{\text{Slope} \cdot \Delta s \cdot (2s + \Delta s)}{2 \cdot \text{Scale}}73264
   - Completely symmetric, transparent buy & sell refunds with zero human front-running.
   - 80% supply minted triggers automatic graduation.
4. **Event-Driven Reactive Tokenomics (Surge Burns)**: If the influencer tweets about the topic again within the surge window, validator consensus triggers an automated **10% supply burn** of unminted curve tokens, permanently increasing scarcity and rewarding early community holders!

---

## 📜 Intelligent Contract Architecture

- **Contract**: [`contracts/trend_pump.py`](contracts/trend_pump.py)
- **Deployed Address (StudioNet)**: [`0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693`](https://explorer-studio.genlayer.com/address/0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693)
- **Methods**:
  - `scan_and_launch(tweet_url, tweet_text, author) -> u256`: Non-deterministic LLM consensus launch.
  - `buy_tokens(token_id, token_amount) -> u256`: Buy tokens via bonding curve.
  - `sell_tokens(token_id, token_amount) -> u256`: Sell tokens for GEN refund.
  - `detect_trend_surge(token_id, follow_up_tweet_url, follow_up_text) -> dict`: Triggers 10% supply burn on trend confirmation.
  - `faucet() -> u256`: Claims testnet GEN for immediate trading.
  - `get_tokens() -> list[dict]`: Returns all autonomous meme tokens.
  - `get_token(token_id) -> dict`: Returns token supply, reserve, and graduation status.
  - `get_balance(token_id, account) -> int`: Returns user token balance.
  - `get_buy_price(token_id, amount) -> int`: Current curve quote to buy.
  - `get_sell_price(token_id, amount) -> int`: Current curve quote to sell.

---

## 🧪 Unit Testing (10/10 In-Memory GenVM Simulator)

All 10 unit tests pass with 100% coverage in the GenVM simulator:
```bash
pytest tests/direct/test_trend_pump.py -v
```
1. `test_initial_state`: Empty registry initialization.
2. `test_scan_and_launch_viral`: Consensus passes (score 91), mints $MARS token.
3. `test_scan_and_launch_not_viral_rejected`: Low score (45) rolls back launch.
4. `test_faucet_and_deposit`: GEN funding mechanisms.
5. `test_buy_tokens_advances_curve`: Curve advances, price increases deterministically.
6. `test_sell_tokens_refunds_gen`: Symmetric sell refund returned to seller.
7. `test_buy_insufficient_gen_fails`: Balance validation check.
8. `test_sell_more_than_balance_fails`: Over-selling prevention check.
9. `test_trend_surge_burn_reduces_supply`: 10% supply burn executed on trend surge.
10. `test_bonding_curve_graduation`: Crossing 80% supply marks token as graduated.

---

## 🌐 Live Web Application

- **Live dApp URL**: [https://genfun.arcstones.xyz/](https://genfun.arcstones.xyz/)

## 🛠️ Deployment & Verification

```bash
# Deploy to GenLayer StudioNet
python3 scripts/deploy_trend_pump.py
```

Verified on GenLayer StudioNet Explorer:
🔗 [https://explorer-studio.genlayer.com/address/0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693](https://explorer-studio.genlayer.com/address/0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693)
