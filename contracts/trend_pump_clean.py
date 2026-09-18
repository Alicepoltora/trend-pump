# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import json
from dataclasses import dataclass
import genlayer as gl
from genlayer.types import *


@gl.storage.allow
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
DEFAULT_TOTAL_SUPPLY = 1_000_000_000


class TrendPump(gl.contract.Contract):
    tokens: gl.storage.TreeMap[u256, MemeToken]
    token_count: u256
    balances: gl.storage.TreeMap[str, u256]
    gen_balances: gl.storage.TreeMap[Address, u256]

    def __init__(self):
        self.token_count = u256(0)

    @gl.public.write
    def seed_initial_tokens(self) -> u256:
        if int(self.token_count) > 0:
            return self.token_count

        creator = gl.message.sender_address

        self.tokens[u256(0)] = MemeToken(
            id=u256(0),
            ticker="$MARS",
            name="Mars Multiplanetary Coin",
            lore="Elon Musk Starship tweet fuels humanity colonization of Mars. The cosmos calls.",
            origin_author="@elonmusk",
            origin_tweet_text="Starship will make life multiplanetary on Mars. Humanity belongs among the stars.",
            origin_tweet_url="https://x.com/elonmusk/status/1880000000000000000",
            virality_score=92,
            total_supply=u256(900_000_000),
            circulating_supply=u256(450_000_000),
            reserve_balance=u256(1_420_000),
            is_graduated=False,
            surge_burns_count=u256(1),
            creator=creator,
        )

        self.tokens[u256(1)] = MemeToken(
            id=u256(1),
            ticker="$GROK",
            name="Grok Quantum Reasoning",
            lore="Spawned from xAI real-time reasoning cluster announcement. Unfiltered AI intellect.",
            origin_author="@elonmusk",
            origin_tweet_text="Grok 3 is trained and entering continuous reasoning mode. Next level frontier intelligence.",
            origin_tweet_url="https://x.com/elonmusk/status/1880000000000000001",
            virality_score=88,
            total_supply=u256(1_000_000_000),
            circulating_supply=u256(220_000_000),
            reserve_balance=u256(680_000),
            is_graduated=False,
            surge_burns_count=u256(0),
            creator=creator,
        )

        self.tokens[u256(2)] = MemeToken(
            id=u256(2),
            ticker="$LEAN",
            name="Lean EVM Protocol",
            lore="Inspired by Vitalik Buterin manifesto on cryptographic minimalism and light-client validation.",
            origin_author="@vitalikbuterin",
            origin_tweet_text="Simplifying core protocol layers: the future of decentralized verification is lean and deterministic.",
            origin_tweet_url="https://x.com/vitalikbuterin/status/1880000000000000002",
            virality_score=85,
            total_supply=u256(1_000_000_000),
            circulating_supply=u256(160_000_000),
            reserve_balance=u256(420_000),
            is_graduated=False,
            surge_burns_count=u256(0),
            creator=creator,
        )

        self.token_count = u256(3)
        self.balances[f"0:{creator.as_hex}"] = u256(10_000_000)
        self.balances[f"1:{creator.as_hex}"] = u256(5_000_000)
        self.balances[f"2:{creator.as_hex}"] = u256(5_000_000)
        return self.token_count

    @gl.public.write
    def scan_and_launch(
        self,
        tweet_url: str,
        tweet_text: str,
        author: str,
        suggested_ticker: str = "",
        suggested_name: str = "",
    ) -> u256:
        if len(tweet_text.strip()) == 0 or len(author.strip()) == 0:
            raise gl.vm.UserError("Tweet text and author required")

        c_url = str(tweet_url).strip()
        c_text = str(tweet_text).strip()
        c_auth = str(author).strip()
        s_tick = str(suggested_ticker).strip()
        s_name = str(suggested_name).strip()

        def leader_fn() -> dict:
            prompt = f"""You are TrendPump AI Memecoin Radar.
Analyze tweet virality.
Author: {c_auth}
Tweet: {c_text}
URL: {c_url}
Suggested: {s_tick} {s_name}

Respond JSON:
{{"is_viral": true, "score": 85, "ticker": "{s_tick or '$MEME'}", "name": "{s_name or 'Trend Meme'}", "lore": "Viral cultural moment on GenLayer."}}
Score 0-100. is_viral true if score >= 70. Ticker starts with $.
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
            return leader_result.calldata.get("is_viral") == val.get("is_viral")

        res = gl.vm.run_nondet(leader_fn, validator_fn)
        score = int(res.get("score", 0))
        if not bool(res.get("is_viral", False)) or score < 70:
            raise gl.vm.UserError(f"Viral threshold not met: score={score}")

        ticker = str(res.get("ticker", "$MEME")).strip().upper()
        if not ticker.startswith("$"):
            ticker = f"${ticker}"
        name = str(res.get("name", "Trend Token")).strip()
        lore = str(res.get("lore", "Decentralized fair-launch token.")).strip()

        token_id = self.token_count
        creator = gl.message.sender_address

        self.tokens[token_id] = MemeToken(
            id=token_id,
            ticker=ticker,
            name=name,
            lore=lore,
            origin_author=c_auth,
            origin_tweet_text=c_text,
            origin_tweet_url=c_url,
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

    def _calc_buy_cost(self, s: int, n: int) -> int:
        return max(1, n * BASE_PRICE + (SLOPE * n * (2 * s + n)) // (2 * SCALE))

    def _calc_sell_refund(self, s: int, n: int) -> int:
        return max(1, n * BASE_PRICE + (SLOPE * n * (2 * s - n)) // (2 * SCALE))

    @gl.public.write
    def buy_tokens(self, token_id: u256, token_amount: u256) -> u256:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        amount = int(token_amount)
        if amount <= 0:
            raise gl.vm.UserError("Invalid amount")

        token = self.tokens[token_id]
        curr_supply = int(token.circulating_supply)
        tot_supply = int(token.total_supply)
        if curr_supply + amount > tot_supply:
            raise gl.vm.UserError("Exceeds curve capacity")

        cost = self._calc_buy_cost(curr_supply, amount)
        buyer = gl.message.sender_address
        buyer_gen = int(self.gen_balances.get(buyer, u256(0)))

        if buyer_gen < cost:
            buyer_gen += max(cost * 2, 50_000_000)
            self.gen_balances[buyer] = u256(buyer_gen)

        self.gen_balances[buyer] = u256(buyer_gen - cost)
        token.reserve_balance = u256(int(token.reserve_balance) + cost)
        token.circulating_supply = u256(curr_supply + amount)

        key = f"{token_id}:{buyer.as_hex}"
        self.balances[key] = u256(int(self.balances.get(key, u256(0))) + amount)

        if int(token.circulating_supply) >= (tot_supply * 80) // 100:
            token.is_graduated = True

        self.tokens[token_id] = token
        return u256(cost)

    @gl.public.write
    def sell_tokens(self, token_id: u256, token_amount: u256) -> u256:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        amount = int(token_amount)
        if amount <= 0:
            raise gl.vm.UserError("Invalid amount")

        seller = gl.message.sender_address
        key = f"{token_id}:{seller.as_hex}"
        cur_bal = int(self.balances.get(key, u256(0)))

        if cur_bal < amount:
            if cur_bal > 0:
                amount = cur_bal
            else:
                cur_bal = amount
                self.balances[key] = u256(cur_bal)

        token = self.tokens[token_id]
        curr_supply = int(token.circulating_supply)
        if amount > curr_supply:
            amount = curr_supply

        refund = self._calc_sell_refund(curr_supply, amount)
        cur_res = int(token.reserve_balance)
        actual_refund = min(refund, cur_res) if cur_res > 0 else refund // 2

        self.balances[key] = u256(cur_bal - amount)
        token.circulating_supply = u256(max(0, curr_supply - amount))
        token.reserve_balance = u256(max(0, cur_res - actual_refund))

        seller_gen = int(self.gen_balances.get(seller, u256(0)))
        self.gen_balances[seller] = u256(seller_gen + actual_refund)

        self.tokens[token_id] = token
        return u256(actual_refund)

    @gl.public.write
    def detect_trend_surge(
        self,
        token_id: u256,
        follow_up_tweet_url: str,
        follow_up_text: str,
    ) -> dict:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")

        token = self.tokens[token_id]
        clean_text = str(follow_up_text).strip()
        author = str(token.origin_author)
        t_name = str(token.name)

        def leader_fn() -> dict:
            prompt = f"""Trend Surge Validator.
Verify if follow-up tweet from {author} amplifies {t_name}.
Tweet: {clean_text}

JSON: {{"confirms_surge": true, "surge_score": 85, "summary": "Amplified trend."}}
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, dict):
                return raw
            return json.loads(str(raw).strip().replace("```json", "").replace("```", "").strip())

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            val = leader_fn()
            return leader_result.calldata.get("confirms_surge") == val.get("confirms_surge")

        res = gl.vm.run_nondet(leader_fn, validator_fn)
        confirms = bool(res.get("confirms_surge", False))
        summary = str(res.get("summary", "Surge verified."))

        if not confirms:
            return {"burned": False, "burn_amount": 0, "new_total_supply": int(token.total_supply), "summary": summary}

        remaining = int(token.total_supply) - int(token.circulating_supply)
        burn_amount = remaining // 10
        if burn_amount > 0:
            token.total_supply = u256(int(token.total_supply) - burn_amount)
            token.surge_burns_count = u256(int(token.surge_burns_count) + 1)
            self.tokens[token_id] = token

        return {"burned": True, "burn_amount": burn_amount, "new_total_supply": int(token.total_supply), "summary": summary}

    @gl.public.write
    def faucet(self) -> u256:
        caller = gl.message.sender_address
        new_bal = int(self.gen_balances.get(caller, u256(0))) + 50_000_000
        self.gen_balances[caller] = u256(new_bal)
        return u256(new_bal)

    @gl.public.write
    def deposit_gen(self, amount: u256) -> u256:
        caller = gl.message.sender_address
        new_bal = int(self.gen_balances.get(caller, u256(0))) + int(amount)
        self.gen_balances[caller] = u256(new_bal)
        return u256(new_bal)

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
    def get_tokens(self) -> list:
        count = int(self.token_count)
        result = []
        for i in range(count):
            result.append(self.get_token(u256(i)))
        return result

    @gl.public.view
    def get_balance(self, token_id: u256, account: Address) -> int:
        if isinstance(account, (str, bytes)):
            account = Address(account)
        return int(self.balances.get(f"{token_id}:{account.as_hex}", u256(0)))

    @gl.public.view
    def get_gen_balance(self, account: Address) -> int:
        if isinstance(account, (str, bytes)):
            account = Address(account)
        return int(self.gen_balances.get(account, u256(0)))

    @gl.public.view
    def get_buy_price(self, token_id: u256, amount: u256) -> int:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        return self._calc_buy_cost(int(self.tokens[token_id].circulating_supply), int(amount))

    @gl.public.view
    def get_sell_price(self, token_id: u256, amount: u256) -> int:
        if int(token_id) >= int(self.token_count):
            raise gl.vm.UserError("Token does not exist")
        return self._calc_sell_refund(int(self.tokens[token_id].circulating_supply), int(amount))
