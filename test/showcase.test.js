import test from "node:test";
import assert from "node:assert/strict";
import { createPkcePair, decryptCredential, encryptCredential } from "../src/security.js";
import { canExecute, proposeAction, transition } from "../src/approval-workflow.js";

test("PKCE pair uses URL-safe values", async () => {
  const pair = await createPkcePair();
  assert.match(pair.verifier, /^[A-Za-z0-9_-]+$/);
  assert.match(pair.challenge, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(pair.verifier, pair.challenge);
});

test("credentials round-trip through AES-GCM", async () => {
  const secret = "portfolio-only-development-secret";
  const encrypted = await encryptCredential(secret, { accessToken: "fictional", scopes: ["mail.read"] });
  assert.equal(encrypted.includes("fictional"), false);
  assert.deepEqual(await decryptCredential(secret, encrypted), { accessToken: "fictional", scopes: ["mail.read"] });
});

test("AI proposal cannot execute before human approval", () => {
  const proposed = proposeAction({ workspaceId: "demo", actorId: "ai-agent", action: "send_quote", payload: { leadId: "L-1" } });
  assert.equal(canExecute(proposed), false);
  const approved = transition(proposed, "approved", "human-owner");
  assert.equal(canExecute(approved), true);
  assert.throws(() => transition(proposed, "completed", "ai-agent"), /invalid_transition/);
});

