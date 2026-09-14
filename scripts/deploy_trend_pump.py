"""
Deploy TrendPump Intelligent Contract to GenLayer StudioNet.
Uses the funded wallet provided by the user.
"""

import os
import sys
import json
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from eth_account import Account
import genlayer_py as gl
from genlayer_py.types.transactions import TransactionStatus

# Load from .env if present
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

PRIVATE_KEY = os.getenv("GENLAYER_PRIVATE_KEY", "0x1344e32ee1073b2434ed058bebb0871d3109d362630e35fc0d463c68464b6138")
CONTRACT_PATH = Path(__file__).parent.parent / "contracts" / "trend_pump.py"


def main():
    print("=" * 60)
    print("🚀 DEPLOYING TRENDPUMP INTELLIGENT CONTRACT TO GENLAYER")
    print("=" * 60)

    if not PRIVATE_KEY:
        print("❌ Error: GENLAYER_PRIVATE_KEY is not set.")
        sys.exit(1)

    account = Account.from_key(PRIVATE_KEY)
    print(f"Deployer Address: {account.address}")

    client = gl.create_client(gl.studionet, account=account)
    balance_wei = client.w3.eth.get_balance(account.address)
    balance_gen = balance_wei / 1e18
    print(f"Network: GenLayer StudioNet ({gl.studionet.rpc_urls['default']['http'][0]})")
    print(f"Account Balance: {balance_gen:.4f} GEN ({balance_wei} wei)")

    if balance_wei == 0:
        raise RuntimeError(f"Account {account.address} has 0 GEN balance on StudioNet!")

    print(f"\nReading contract from: {CONTRACT_PATH}")
    with open(CONTRACT_PATH, "r", encoding="utf-8") as f:
        contract_code = f.read()

    print(f"Contract size: {len(contract_code)} bytes")
    print("\nInitializing consensus smart contract...")
    try:
        client.initialize_consensus_smart_contract()
        print("✓ Consensus smart contract initialized")
    except Exception as e:
        print(f"Note on initialize_consensus: {e}")

    print("\nSubmitting deploy transaction to GenLayer StudioNet...")
    tx_hash = client.deploy_contract(
        code=contract_code,
        args=[],
        leader_only=False,
    )
    tx_hex = tx_hash.hex() if hasattr(tx_hash, "hex") else str(tx_hash)
    print(f"Deploy Transaction Hash: {tx_hex}")

    print("Waiting for transaction receipt (status: ACCEPTED)...")
    receipt = client.wait_for_transaction_receipt(
        tx_hash,
        status=TransactionStatus.ACCEPTED,
        retries=60,
        interval=3000,
        full_transaction=True,
    )

    print(f"\nTransaction confirmed!")
    print(f"Receipt status: {receipt.status}")

    # Extract contract address
    contract_address = None
    if hasattr(receipt, "contract_address") and receipt.contract_address:
        contract_address = receipt.contract_address
    elif hasattr(receipt, "data") and isinstance(receipt.data, dict) and "contract_address" in receipt.data:
        contract_address = receipt.data["contract_address"]
    elif hasattr(receipt, "tx_data_decoded") and receipt.tx_data_decoded:
        contract_address = getattr(receipt.tx_data_decoded, "contract_address", None)

    if not contract_address:
        for attr in ["contract_address", "recipient", "to", "result"]:
            val = getattr(receipt, attr, None)
            if val:
                print(f"Receipt field {attr}: {val}")
                if attr == "contract_address":
                    contract_address = val

    print(f"\n🎉 DEPLOYED TRENDPUMP CONTRACT ADDRESS: {contract_address}")

    # Save to artifacts
    artifacts_dir = Path(__file__).parent.parent / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    deployment_info = {
        "network": "studionet",
        "rpc_url": gl.studionet.rpc_urls["default"]["http"][0],
        "deployer": account.address,
        "contract_address": str(contract_address) if contract_address else "unknown",
        "transaction_hash": tx_hex,
        "timestamp": int(time.time()),
    }
    with open(artifacts_dir / "deployment.json", "w") as f:
        json.dump(deployment_info, f, indent=2)

    print(f"Deployment info saved to: {artifacts_dir / 'deployment.json'}")

    if contract_address:
        try:
            print("\nVerifying deployed contract state via read_contract...")
            count = client.read_contract(contract_address, "get_token_count", [])
            print(f"✓ Initial get_token_count() returned: {count}")
        except Exception as e:
            print(f"Note on initial read: {e}")

    print("\n✅ TrendPump deployment completed successfully!")
    return contract_address


if __name__ == "__main__":
    main()
