# ADR 0002: Circle developer-controlled wallets

## Status

Accepted for the initial product.

## Decision

Kaska provisions a Circle developer-controlled wallet for each user. Kaska may
initiate an authorized scheduled run without requiring an interactive wallet
signature for every occurrence.

## Constraints

This custody model requires:

- explicit per-run, daily, and monthly spending limits;
- idempotent financial operations;
- a complete user-visible audit trail;
- strict withdrawal and ownership validation;
- secure operator credentials and key rotation;
- reconciliation of Circle, database, and Arc state;
- the ability to pause recurring work immediately.

Developer control does not grant agents arbitrary spending authority. Agents
may initially spend only through Kaska's task escrow workflow.

