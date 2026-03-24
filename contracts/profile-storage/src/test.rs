#![cfg(test)]

use super::*;
use soroban_sdk::{Env, String, testutils::Address as _};

#[test]
fn test_set_and_get_profile() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ProfileStorageContract);
    let client = ProfileStorageContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let name = String::from_str(&env, "Alice");
    let bio = String::from_str(&env, "Blockchain enthusiast");

    client.set_profile(&user, &name, &bio);

    let (ret_name, ret_bio) = client.get_profile(&user);
    assert_eq!(ret_name, name);
    assert_eq!(ret_bio, bio);
}

#[test]
fn test_get_nonexistent_profile() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ProfileStorageContract);
    let client = ProfileStorageContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    let (ret_name, ret_bio) = client.get_profile(&user);
    assert_eq!(ret_name, String::from_str(&env, "Unknown"));
    assert_eq!(ret_bio, String::from_str(&env, "No bio available"));
}
