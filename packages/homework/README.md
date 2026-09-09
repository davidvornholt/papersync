# Homework contract

Shared schemas and identity logic for the hosted queue and the Super Productivity plugin. Identity uses the sheet's week, written day, subject, and whitespace-normalized text. Due date and completion are payload revisions, so corrections can update the same imported task.

The plugin acknowledges an exact payload revision only after creating or recognizing its Super Productivity task. The app keeps the newer revision pending if an older acknowledgement arrives later.

Run `bun run test` for calendar validation and identity regressions. This package consumes no environment variables.
