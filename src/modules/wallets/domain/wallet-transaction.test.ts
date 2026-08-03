import assert from "node:assert/strict";
import test from "node:test";

import { transactionDirection } from "./wallet-transaction";

test("deposits credit and withdrawals debit the wallet", () => {
  assert.equal(transactionDirection("deposit"), "credit");
  assert.equal(transactionDirection("withdrawal"), "debit");
});
