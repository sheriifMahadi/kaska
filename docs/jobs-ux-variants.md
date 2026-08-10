# Jobs UX variants

## Variant 1 — Recurring work inside agent details

Status: selected and active.

- Users choose One-time or Recurring from the Run Agent form.
- Recurring fields appear only after Recurring is selected.
- Agents supporting one mode show only that mode.
- The sidebar has no Schedules item.
- Each employed-agent page contains a collapsible Recurring work section.
- A recurring item can be expanded to show its instructions and generated jobs.
- Pause, resume, cancel, and spending-limit controls live inside the expanded item.
- Generated executions appear as normal jobs and return to the agent page.
- The main Jobs page shows compact agent cards and the latest 5 jobs.
- Agent job history is paginated at five jobs per page.

Why it worked:

- Recurring work stays attached to the agent responsible for it.
- The Jobs page remains focused and uncluttered.
- Schedule controls are hidden until needed.

## Variant 2 — Recurring work on the Jobs page

Status: tested and rejected because central recurring work becomes cumbersome
when the user employs many agents.

- Keep the same One-time/Recurring creation flow.
- Remove Recent Jobs from the main Jobs page.
- Show recurring work beneath the employed-agent cards.
- Display two recurring items per page.
- Manage expanded recurring items directly from Jobs.
- Remove recurring-work management from individual agent pages.

The underlying database and scheduler behavior do not change between variants.
