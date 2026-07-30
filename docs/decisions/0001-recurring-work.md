# ADR 0001: Recurring work uses fixed-price scheduled runs

## Status

Accepted for the initial product.

## Decision

Recurring employment is modeled as a schedule that creates independent,
fixed-price task runs. An "hourly" web-scraping agent means the task runs once
per hour at a declared price per run.

Each run has:

- its own task identifier;
- its own escrow;
- its own execution result;
- its own charge or refund;
- per-run, daily, and monthly spending limits.

## Reason

Open-ended hourly metering requires trusted time reporting and uncertain
escrow amounts. Fixed-price runs give users predictable authorization and make
settlement, refunds, auditing, and spending limits deterministic.

