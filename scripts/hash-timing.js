// Task 4, step 4: how long does a password hash take on this machine, and how does Argon2id
// compare with a fast hash (SHA-256)? Run it twice and save the output (see the commands in
// task-04-server-source-of-truth/docs). Nothing here touches the database.
const argon2 = require("argon2");
const crypto = require("crypto");

(async () => {
  const pw = "correct horse battery staple";

  // 1. The same password hashed twice gives two different hashes, because each hash gets a random salt.
  const a = await argon2.hash(pw, { type: argon2.argon2id });
  const b = await argon2.hash(pw, { type: argon2.argon2id });
  console.log("hash1:", a);
  console.log("hash2:", b);
  console.log("same password, same hash?", a === b);
  console.log("each hash still verifies:", await argon2.verify(a, pw), await argon2.verify(b, pw));

  // 2. Timing: one Argon2id hash, against the average of 1000 SHA-256 hashes.
  let t = process.hrtime.bigint();
  await argon2.hash(pw, { type: argon2.argon2id });
  const argonMs = Number(process.hrtime.bigint() - t) / 1e6;

  t = process.hrtime.bigint();
  for (let i = 0; i < 1000; i++) crypto.createHash("sha256").update(pw).digest("hex");
  const shaMs = Number(process.hrtime.bigint() - t) / 1e6 / 1000; // average per hash

  console.log({
    argonMs,
    shaMs,
    argonGuessesPerSec: 1000 / argonMs,
    shaGuessesPerSec: 1000 / shaMs,
  });
})();
