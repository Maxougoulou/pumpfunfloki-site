/**
 * Génère un keypair Solana de TEST et l'affiche formaté pour .env.local
 * Usage: node scripts/gen-test-wallet.mjs
 *
 * ⚠️  CE WALLET EST POUR LES TESTS UNIQUEMENT ⚠️
 * Pour la prod, utilise: solana-keygen new --outfile rewards-wallet.json
 */

import { Keypair } from "@solana/web3.js";

const kp = Keypair.generate();
const arr = Array.from(kp.secretKey);

console.log("\n✅ Test wallet generated!\n");
console.log("Public key (adresse publique):");
console.log(" ", kp.publicKey.toBase58());
console.log("\n.env.local — colle ça:");
console.log(`REWARDS_WALLET_PRIVATE_KEY=${JSON.stringify(arr)}`);
console.log("\n⚠️  TEST UNIQUEMENT — ne jamais utiliser pour de vrais fonds\n");
