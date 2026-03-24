#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String};

#[contract]
pub struct ProfileStorageContract;

#[contractimpl]
impl ProfileStorageContract {
    /// Save or update a profile for the user
    pub fn set_profile(env: Env, user: Address, name: String, bio: String) {
        user.require_auth();

        // Store the profile as a tuple of (name, bio)
        env.storage()
            .persistent()
            .set(&user, &(name, bio));
    }

    /// Retrieve a profile for the user
    pub fn get_profile(env: Env, user: Address) -> (String, String) {
        env.storage()
            .persistent()
            .get(&user)
            .unwrap_or((String::from_str(&env, "Unknown"), String::from_str(&env, "No bio available")))
    }
}

mod test;
