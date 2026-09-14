"""Direct mode tests for TrendPump intelligent contract."""

import json
import pytest
from tests.direct.conftest import to_hex

CONTRACT_PATH = "contracts/trend_pump.py"


def _setup_launch_mocks(
    vm,
    is_viral: bool,
    score: int,
    ticker: str = "$MARS",
    name: str = "Mars Coin",
    lore: str = "Mars mission lore",
):
    vm.clear_mocks()
    vm.mock_web(
        r".*",
        {"status": 200, "body": "Verified tweet content from Twitter / X."},
    )
    vm.mock_llm(
        r".*TrendPump Autonomous AI Memecoin Radar.*",
        json.dumps(
            {
                "is_viral": is_viral,
                "score": score,
                "ticker": ticker,
                "name": name,
                "lore": lore,
            }
        ),
    )


def _setup_surge_mocks(
    vm,
    confirms_surge: bool,
    surge_score: int = 85,
    summary: str = "Author confirmed",
):
    vm.clear_mocks()
    vm.mock_web(
        r".*",
        {"status": 200, "body": "Verified follow up tweet."},
    )
    vm.mock_llm(
        r".*TrendPump Trend Surge Validator.*",
        json.dumps(
            {
                "confirms_surge": confirms_surge,
                "surge_score": surge_score,
                "summary": summary,
            }
        ),
    )


def test_initial_state(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT_PATH)
    assert contract.get_token_count() == 0
    assert contract.get_tokens() == []


def test_scan_and_launch_viral(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice
    alice_hex = to_hex(direct_alice)

    _setup_launch_mocks(
        direct_vm,
        is_viral=True,
        score=91,
        ticker="$MARS",
        name="Mars Colonization Coin",
        lore="Inspired by Elon Musk's interplanetary vision.",
    )

    token_id = contract.scan_and_launch(
        "https://x.com/elonmusk/status/1880000000000000000",
        "Starship will make life multiplanetary on Mars.",
        "@elonmusk",
    )
    assert token_id == 0
    assert contract.get_token_count() == 1

    token = contract.get_token(0)
    assert token["id"] == 0
    assert token["ticker"] == "$MARS"
    assert token["name"] == "Mars Colonization Coin"
    assert token["virality_score"] == 91
    assert token["total_supply"] == 1_000_000_000
    assert token["circulating_supply"] == 0
    assert token["reserve_balance"] == 0
    assert token["is_graduated"] is False
    assert token["creator"] == alice_hex


def test_scan_and_launch_not_viral_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    # Mock low virality score
    _setup_launch_mocks(
        direct_vm,
        is_viral=False,
        score=45,
        ticker="$BORING",
        name="Boring Meeting Token",
        lore="Routine announcement.",
    )

    from gltest.direct import ContractRollback

    with pytest.raises((ContractRollback, Exception)):
        contract.scan_and_launch(
            "https://x.com/random/status/123",
            "Having a standard team sync today.",
            "@random_user",
        )

    assert contract.get_token_count() == 0


def test_faucet_and_deposit(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    assert contract.get_gen_balance(direct_alice) == 0

    contract.faucet()
    assert contract.get_gen_balance(direct_alice) == 1_000_000

    contract.deposit_gen(500_000)
    assert contract.get_gen_balance(direct_alice) == 1_500_000


def test_buy_tokens_advances_curve(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    _setup_launch_mocks(direct_vm, is_viral=True, score=85, ticker="$GROK")
    token_id = contract.scan_and_launch(
        "https://x.com/elonmusk/status/1",
        "Grok 3 is trained and entering reasoning mode.",
        "@elonmusk",
    )

    # Bob gets faucet GEN and buys 50,000 tokens
    direct_vm.sender = direct_bob
    contract.faucet()  # Bob now has 1,000,000 GEN

    price_quote_1 = contract.get_buy_price(0, 50_000)
    assert price_quote_1 > 0

    cost = contract.buy_tokens(0, 50_000)
    assert cost == price_quote_1

    # Verify Bob's token balance
    bob_bal = contract.get_balance(0, direct_bob)
    assert bob_bal == 50_000

    # Verify contract updated circulating supply & reserve
    token = contract.get_token(0)
    assert token["circulating_supply"] == 50_000
    assert token["reserve_balance"] == cost

    # Price for next 50,000 tokens should be higher due to bonding curve slope
    price_quote_2 = contract.get_buy_price(0, 50_000)
    assert price_quote_2 > price_quote_1


def test_sell_tokens_refunds_gen(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    _setup_launch_mocks(direct_vm, is_viral=True, score=88, ticker="$DOGE2")
    contract.scan_and_launch(
        "https://x.com/elonmusk/status/2",
        "Doge to the literal moon.",
        "@elonmusk",
    )

    direct_vm.sender = direct_bob
    contract.faucet()
    init_gen = contract.get_gen_balance(direct_bob)

    buy_amount = 20_000
    cost = contract.buy_tokens(0, buy_amount)
    assert contract.get_gen_balance(direct_bob) == init_gen - cost

    # Now sell back all 20,000 tokens
    refund = contract.sell_tokens(0, buy_amount)
    assert refund == cost  # Symmetric curve guarantees full refund when returning to origin

    # Check balances after sell
    assert contract.get_balance(0, direct_bob) == 0
    assert contract.get_gen_balance(direct_bob) == init_gen
    token = contract.get_token(0)
    assert token["circulating_supply"] == 0
    assert token["reserve_balance"] == 0


def test_buy_insufficient_gen_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    _setup_launch_mocks(direct_vm, is_viral=True, score=80, ticker="$NEO")
    contract.scan_and_launch("https://x.com/elonmusk/status/3", "Matrix is real", "@elonmusk")

    direct_vm.sender = direct_bob
    # Bob has 0 GEN balance
    from gltest.direct import ContractRollback

    with pytest.raises((ContractRollback, Exception)):
        contract.buy_tokens(0, 10_000)


def test_sell_more_than_balance_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    _setup_launch_mocks(direct_vm, is_viral=True, score=80, ticker="$CYBER")
    contract.scan_and_launch("https://x.com/elonmusk/status/4", "Cybertruck vibe", "@elonmusk")

    direct_vm.sender = direct_bob
    contract.faucet()
    contract.buy_tokens(0, 5_000)

    from gltest.direct import ContractRollback

    # Bob tries to sell 10,000 but only holds 5,000
    with pytest.raises((ContractRollback, Exception)):
        contract.sell_tokens(0, 10_000)


def test_trend_surge_burn_reduces_supply(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    _setup_launch_mocks(direct_vm, is_viral=True, score=92, ticker="$STARSHIP")
    contract.scan_and_launch(
        "https://x.com/elonmusk/status/5",
        "Flight 6 starship booster caught by tower arms.",
        "@elonmusk",
    )

    token_before = contract.get_token(0)
    assert token_before["total_supply"] == 1_000_000_000
    assert token_before["surge_burns_count"] == 0

    # Follow up tweet confirms surge
    _setup_surge_mocks(
        direct_vm,
        confirms_surge=True,
        surge_score=95,
        summary="Elon posted high-def video confirming tower catch milestone.",
    )

    surge_res = contract.detect_trend_surge(
        0,
        "https://x.com/elonmusk/status/6",
        "Mechazilla has caught the Super Heavy booster!",
    )

    assert surge_res["burned"] is True
    assert surge_res["burn_amount"] == 100_000_000  # 10% of 1B unminted supply
    assert surge_res["new_total_supply"] == 900_000_000

    token_after = contract.get_token(0)
    assert token_after["total_supply"] == 900_000_000
    assert token_after["surge_burns_count"] == 1


def test_bonding_curve_graduation(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT_PATH)
    direct_vm.sender = direct_alice

    _setup_launch_mocks(direct_vm, is_viral=True, score=99, ticker="$ALPHA")
    contract.scan_and_launch("https://x.com/vitalik/status/7", "Ethereum 2030 roadmap", "@vitalik")

    direct_vm.sender = direct_bob
    # Give Bob large GEN balance to hit graduation threshold (80% = 800M tokens)
    contract.deposit_gen(100_000_000_000_000)

    token_before = contract.get_token(0)
    assert token_before["is_graduated"] is False

    # Buy 800,000,000 tokens to trigger graduation
    contract.buy_tokens(0, 800_000_000)

    token_after = contract.get_token(0)
    assert token_after["circulating_supply"] == 800_000_000
    assert token_after["is_graduated"] is True
