# Project Rules

- **CRITICAL**: Never run database refresh or reset commands (such as `migrate:fresh`, `migrate:refresh`, `db:seed` in loops, or any database destructive command) without asking the user for explicit permission first. This rule is permanent and always valid for this workspace.
