 Profile Storage Smart Contract

A simple Stellar Soroban smart contract to store and retrieve user profiles (name and bio) directly on the blockchain.

## Prerequisites

- Rust and Cargo: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Target `wasm32-unknown-unknown`: `rustup target add wasm32-unknown-unknown`
- Stellar CLI: `cargo install --locked stellar-cli@22.0.0`

## CLI Commands

### 1. Build Contract

Navigate to the project root and build the contract into a WASM binary:

```bash
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM file will be located at `target/wasm32-unknown-unknown/release/profile_storage.wasm`.

### 2. Deploy Contract

Deploy the contract to the Stellar Testnet:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/profile_storage.wasm \
  --source alice \
  --network testnet
```

Wait for the deployment to finish and copy the `Contract ID` (e.g. `C...`). Use this Contract ID in the following commands.

### 3. Invoke `set_profile`

Set your profile data on the blockchain. Ensure you replace `<CONTRACT_ID>` with your deployed contract's ID.

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- \
  set_profile \
  --user alice \
  --name "Stellar Explorer" \
  --bio "Building on Soroban"
```

### 4. Invoke `get_profile`

Read the profile data from the blockchain:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- \
  get_profile \
  --user alice
```
