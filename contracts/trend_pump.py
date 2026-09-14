# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *
import genlayer.gl.vm as glvm


@allow_storage
@dataclass
class MemeToken:
    id: u256
    ticker: str
    name: str
    lore: str
    origin_author: str
    origin_tweet_text: str
    origin_tweet_url: str
    virality_score: i8
    total_supply: u256
    circulating_supply: u256
    reserve_balance: u256
    is_graduated: bool
    surge_burns_count: u256
    creator: Address


BASE_PRICE = 10
SLOPE = 1
SCALE = 100_000
DEFAULT_TOTAL_SUPPLY = 1_000_000_000  # 1 Billion tokens
GRADUATION_PERCENT = 80  # 80% supply minted graduates curve


class TrendPump(gl.Contract):
    """
    TrendPump — Autonomous AI-Driven Memecoin Launchpad on GenLayer.

    Core Innovations:
    1. Zero-Human Token Launches: GenLayer validators monitor high-impact tweets & news feeds.
       When virality consensus (>70) is reached, the contract autonomously coins the ticker ($MARS),
       generates viral lore, and deploys a 100% fair-launch bonding curve.
    2. Mathematical Bonding Curve: Completely fair, transparent pricing algorithm.
    3. Event-Driven Tokenomics (Surge Burns): When influencers follow up on the trend,
       validator consensus triggers an automated 10% supply burn, increasing token scarcity.
    """

    tokens: TreeMap[u256, MemeToken]
    token_count: u256
    balances: TreeMap[str, u256]  # key: f"{token_id}:{address_hex}"
    gen_balances: TreeMap[Address, u256]

    def __init__(self):
        self.token_count = u256(0)

    # ─── Autonomous AI Scanner & Launch ────────────────────────────────────────

    @gl.public.write
    def scan_and_launch(
        self,
        tweet_url: str,
        tweet_text: str,
        author: str,
    ) -> u256:
        """
        Scans a tweet via GenLayer validators using nondet LLM consensus.
        If viral consensus passes (score >= 70), mints and registers a new fair-launch memecoin.
        """
        if len(tweet_text.strip()) == 0:
            raise gl.vm.UserError("Tweet text cannot be empty")
        if len(author.strip()) == 0:
            raise gl.vm.UserError("Author cannot be empty")

        clean_url = str(tweet_url).strip()
        clean_text = str(tweet_text).strip()
        clean_author = str(author).strip()

        def leader_fn() -> dict:
            context = ""
            if clean_url and clean_url.startswith("http"):
                try:
                    web_data = gl.nondet.web.render(clean_url, mode="text")
                    context = f"Rendered tweet content:\n{web_data[:1000]}"
                except Exception:
                    context = f"Tweet URL {clean_url} could not be rendered."

            prompt = f"""You are the TrendPump Autonomous AI Memecoin Radar on GenLayer.
Analyze this tweet and determine if it represents a viral cultural moment worth creating a decentralized fair-launch memecoin.

AUTHOR: {clean_author}
TWEET TEXT: {clean_text}
ADDITIONAL CONTEXT: {context}

Respond in strict JSON:
{{
    "is_viral": true,
    "score": 88,
    "ticker": "$MARS",
    "name": "Mars Colonization Coin",
    "lore": "Sparked by Elon Musk's vision of starship landings on Olympus Mons."
}}
Rules:
- is_viral must be true if score >= 70, false otherwise.
- score must be an integer between 0 and 100.
- ticker must start with $ and be 3-6 uppercase letters (e.g. $DOGE, $MARS, $GROK, $PUMP).
- name must be concise (under 30 characters).
- lore must be 1-2 engaging sentences.
- Output ONLY valid parsable JSON.
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, dict):
                return raw
            cleaned = str(raw).strip().replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            val = leader_fn()
            # Consensus on virality
            if leader_result.calldata.get("is_viral") != val.get("is_viral"):
                return False

            # Score agreement within 15 points
            leader_score = int(leader_result.calldata.get("score", 0))
            val_score = int(val.get("score", 0))
            if abs(leader_score - val_score) > 15:
                return False

            # Ticker must be valid
            ticker = leader_result.calldata.get("ticker", "")
            if not (isinstance(ticker, str) and ticker.startswith("$") and len(ticker) >= 2):
                return False

            return True

        eval_result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        is_viral = bool(eval_result.get("is_viral", False))
        score = int(eval_result.get("score", 0))

        if not is_viral or score < 70:
            raise gl.vm.UserError(
                f"Tweet did not meet viral threshold: score={score} (required >= 70)"
            )

        ticker = str(eval_result.get("ticker", "$MEME")).strip().upper()
        if not ticker.startswith("$"):
            ticker = f"${ticker}"
        name = str(eval_result.get("name", "Trend Token")).strip()
        lore = str(eval_result.get("lore", "")).strip()

        token_id = self.token_count
        creator = gl.message.sender_address

        self.tokens[token_id] = MemeToken(
            id=token_id,
            ticker=ticker,
            name=name,
            lore=lore,
            origin_author=clean_author,
            origin_tweet_text=clean_text,
            origin_tweet_url=clean_url,
            virality_score=score,
            total_supply=u256(DEFAULT_TOTAL_SUPPLY),
            circulating_supply=u256(0),
            reserve_balance=u256(0),
            is_graduated=False,
            surge_burns_count=u256(0),
            creator=creator,
        )

        self.token_count = u256(int(self.token_count) + 1)
        return token_id

    # ─── Bonding Curve Math ───────────────────────────────────────────────────

    def _calc_buy_cost(self, current_supply: int, amount: int) -> int:
        s = current_supply
        n = amount
        # Total cost = n * BASE_PRICE + SLOPE * n * (2s + n) // (2 * SCALE)
        curve_component = (SLOPE * n * (2 * s + n)) // (2 * SCALE)
        cost = n * BASE_PRICE + curve_component
        return max(1, cost)

    def _calc_sell_refund(self, current_supply: int, amount: int) -> int:
        s = current_supply
        n = amount
        # Integral from s - n to s = n * BASE_PRICE + SLOPE * n * (2s - n) // (2 * SCALE)
        curve_component = (SLOPE * n * (2 * s - n)) // (2 * SCALE)
        refund = n * BASE_PRICE + curve_component
        return max(1, refund)

    # ─── Trading Operations ───────────────────────────────────────────────────

    @gl.public.write
    def buy_tokens(self, token_id: u256, token_amount: u256) -> u256:
        """
        Buys tokens from the bonding curve using deposited GEN reserves.
        """
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        amount = int(token_amount)
        if amount <= 0:
            raise gl.vm.UserError("Amount must be greater than zero")

        token = self.tokens[token_id]
        curr_supply = int(token.circulating_supply)
        tot_supply = int(token.total_supply)

        if curr_supply + amount > tot_supply:
            raise gl.vm.UserError(
                f"Exceeds max bonding curve capacity: available {tot_supply - curr_supply}"
            )

        cost = self._calc_buy_cost(curr_supply, amount)
        buyer = gl.message.sender_address
        buyer_gen = int(self.gen_balances.get(buyer, u256(0)))

        if buyer_gen < cost:
            raise gl.vm.UserError(
                f"Insufficient GEN balance: have {buyer_gen} wei, required {cost} wei"
            )

        # Update GEN balances
        self.gen_balances[buyer] = u256(buyer_gen - cost)
        token.reserve_balance = u256(int(token.reserve_balance) + cost)

        # Update token supply & user balance
        token.circulating_supply = u256(curr_supply + amount)
        key = f"{token_id}:{buyer.as_hex}"
        cur_bal = int(self.balances.get(key, u256(0)))
        self.balances[key] = u256(cur_bal + amount)

        # Check graduation threshold (80% minted)
        if int(token.circulating_supply) >= (tot_supply * GRADUATION_PERCENT) // 100:
            token.is_graduated = True

        self.tokens[token_id] = token
        return u256(cost)

    @gl.public.write
    def sell_tokens(self, token_id: u256, token_amount: u256) -> u256:
        """
        Sells tokens back to the bonding curve and receives GEN refund.
        """
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        amount = int(token_amount)
        if amount <= 0:
            raise gl.vm.UserError("Amount must be greater than zero")

        seller = gl.message.sender_address
        key = f"{token_id}:{seller.as_hex}"
        cur_bal = int(self.balances.get(key, u256(0)))

        if cur_bal < amount:
            raise gl.vm.UserError(
                f"Insufficient token balance: have {cur_bal}, trying to sell {amount}"
            )

        token = self.tokens[token_id]
        curr_supply = int(token.circulating_supply)
        if amount > curr_supply:
            raise gl.vm.UserError("Cannot sell more than circulating supply")

        refund = self._calc_sell_refund(curr_supply, amount)

        # Ensure curve reserve has enough to refund
        cur_reserve = int(token.reserve_balance)
        actual_refund = min(refund, cur_reserve)

        # Update token balance & supply
        self.balances[key] = u256(cur_bal - amount)
        token.circulating_supply = u256(curr_supply - amount)
        token.reserve_balance = u256(cur_reserve - actual_refund)

        # Credit seller's GEN balance
        seller_gen = int(self.gen_balances.get(seller, u256(0)))
        self.gen_balances[seller] = u256(seller_gen + actual_refund)

        self.tokens[token_id] = token
        return u256(actual_refund)

    # ─── Event-Driven Reactive Tokenomics (Surge Burns) ────────────────────────

    @gl.public.write
    def detect_trend_surge(
        self,
        token_id: u256,
        follow_up_tweet_url: str,
        follow_up_text: str,
    ) -> dict:
        """
        Monitors follow-up influencer tweets. If consensus verifies the author
        amplified or followed up on the trend, triggers an automated 10% supply burn.
        """
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        if len(follow_up_text.strip()) == 0:
            raise gl.vm.UserError("Follow-up text cannot be empty")

        token = self.tokens[token_id]
        clean_url = str(follow_up_tweet_url).strip()
        clean_text = str(follow_up_text).strip()
        token_name = str(token.name)
        token_ticker = str(token.ticker)
        author = str(token.origin_author)
        lore = str(token.lore)

        def leader_fn() -> dict:
            prompt = f"""You are the TrendPump Trend Surge Validator on GenLayer.
Verify whether a new follow-up tweet from {author} amplifies the trend for memecoin {token_name} ({token_ticker}).

ORIGINAL TOPIC / LORE:
{lore}

FOLLOW-UP TWEET:
{clean_text}

URL: {clean_url}

Respond in strict JSON:
{{
    "confirms_surge": true,
    "surge_score": 85,
    "summary": "Author reaffirmed commitment to the trend."
}}
Rules:
- confirms_surge must be true if surge_score >= 60, false otherwise.
- surge_score must be an integer between 0 and 100.
- Output ONLY parsable JSON.
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, dict):
                return raw
            cleaned = str(raw).strip().replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            val = leader_fn()
            if leader_result.calldata.get("confirms_surge") != val.get("confirms_surge"):
                return False
            return True

        surge_result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        confirms = bool(surge_result.get("confirms_surge", False))
        summary = str(surge_result.get("summary", ""))

        if not confirms:
            return {
                "burned": False,
                "burn_amount": 0,
                "new_total_supply": int(token.total_supply),
                "summary": summary or "Follow-up tweet did not meet surge criteria",
            }

        # Calculate 10% burn on remaining unminted curve supply
        remaining = int(token.total_supply) - int(token.circulating_supply)
        burn_amount = remaining // 10
        if burn_amount > 0:
            token.total_supply = u256(int(token.total_supply) - burn_amount)
            token.surge_burns_count = u256(int(token.surge_burns_count) + 1)
            self.tokens[token_id] = token

        return {
            "burned": True,
            "burn_amount": burn_amount,
            "new_total_supply": int(token.total_supply),
            "summary": summary or "Trend surge confirmed: 10% unminted supply burned!",
        }

    # ─── Liquidity & Faucet Helpers ───────────────────────────────────────────

    @gl.public.write
    def faucet(self) -> u256:
        """Credits 1,000,000 wei GEN to caller for instant testnet trading."""
        caller = gl.message.sender_address
        cur = int(self.gen_balances.get(caller, u256(0)))
        new_bal = cur + 1_000_000
        self.gen_balances[caller] = u256(new_bal)
        return u256(new_bal)

    @gl.public.write
    def deposit_gen(self, amount: u256) -> u256:
        caller = gl.message.sender_address
        cur = int(self.gen_balances.get(caller, u256(0)))
        new_bal = cur + int(amount)
        self.gen_balances[caller] = u256(new_bal)
        return u256(new_bal)

    # ─── View Methods ─────────────────────────────────────────────────────────

    @gl.public.view
    def get_token_count(self) -> int:
        return int(self.token_count)

    @gl.public.view
    def get_token(self, token_id: u256) -> dict:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        t = self.tokens[token_id]
        return {
            "id": int(t.id),
            "ticker": str(t.ticker),
            "name": str(t.name),
            "lore": str(t.lore),
            "origin_author": str(t.origin_author),
            "origin_tweet_text": str(t.origin_tweet_text),
            "origin_tweet_url": str(t.origin_tweet_url),
            "virality_score": int(t.virality_score),
            "total_supply": int(t.total_supply),
            "circulating_supply": int(t.circulating_supply),
            "reserve_balance": int(t.reserve_balance),
            "is_graduated": bool(t.is_graduated),
            "surge_burns_count": int(t.surge_burns_count),
            "creator": t.creator.as_hex,
        }

    @gl.public.view
    def get_tokens(self) -> list[dict]:
        count = int(self.token_count)
        result = []
        for i in range(count):
            t = self.tokens[u256(i)]
            result.append(
                {
                    "id": int(t.id),
                    "ticker": str(t.ticker),
                    "name": str(t.name),
                    "lore": str(t.lore),
                    "origin_author": str(t.origin_author),
                    "origin_tweet_text": str(t.origin_tweet_text),
                    "origin_tweet_url": str(t.origin_tweet_url),
                    "virality_score": int(t.virality_score),
                    "total_supply": int(t.total_supply),
                    "circulating_supply": int(t.circulating_supply),
                    "reserve_balance": int(t.reserve_balance),
                    "is_graduated": bool(t.is_graduated),
                    "surge_burns_count": int(t.surge_burns_count),
                    "creator": t.creator.as_hex,
                }
            )
        return result

    @gl.public.view
    def get_balance(self, token_id: u256, account: Address) -> int:
        if isinstance(account, (str, bytes)):
            account = Address(account)
        key = f"{token_id}:{account.as_hex}"
        return int(self.balances.get(key, u256(0)))

    @gl.public.view
    def get_gen_balance(self, account: Address) -> int:
        if isinstance(account, (str, bytes)):
            account = Address(account)
        return int(self.gen_balances.get(account, u256(0)))

    @gl.public.view
    def get_buy_price(self, token_id: u256, amount: u256) -> int:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        token = self.tokens[token_id]
        return self._calc_buy_cost(int(token.circulating_supply), int(amount))

    @gl.public.view
    def get_sell_price(self, token_id: u256, amount: u256) -> int:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        token = self.tokens[token_id]
        return self._calc_sell_refund(int(token.circulating_supply), int(amount))
