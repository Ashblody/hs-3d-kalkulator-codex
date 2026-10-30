# Google Drive: phase 1

No Google API, OAuth, remote writes or automatic synchronization is enabled.

`Backup.version` stays 1. Optional `sync` metadata uses `schemaVersion: 1`, UUID
`revisionId`, nullable `baseRevisionId`, and persistent browser `deviceId`.
Legacy JSON remains valid. Saving creates a new revision only for changed payloads;
export includes the persisted revision when it matches the current UI data.
A JSON import creates a fresh local revision rather than pretending to acknowledge
an uploaded revision. Device IDs are identifiers, not credentials.

Before replacing `hs3d.v1`, storage saves and reads back its exact previous bytes
under a unique `hs3d.recovery.<UUID>` key. Failure stops replacement. Corrupt original
bytes are preserved on explicit import too. `recoveryKeys()` lists recovery records;
`restoreRecovery(key)` validates and restores one while preserving the current data.
Recovery records are not automatically deleted. They consume browser storage;
when full, writes stop and the existing JSON export remains available. Browser data
clearing still removes these local copies. No migration is executed by development
commands; existing user data is only touched by normal app use.

`compareRevisions` requires the last acknowledged common revision. With no common
revision, differing snapshots conflict. Only one side changing permits upload or
download; two changed sides conflict even if a timestamp appears newer. This is a
conservative whole-snapshot comparison, without automatic merging.

Phase 2 must implement `RevisionTransport.createRevision` as creation of a separate
immutable JSON file per revision, never update a shared current.json. Drive allows
duplicate filenames: look up by revision ID and verify exact content on retry.
Never infer success from a filename alone. Validate remote JSON before use.
The transport helper does not modify local data or acknowledgement on failure.
Persist acknowledgement only after confirmed upload/download; maintain a durable
pending revision to retry after an ambiguous network failure. Discover all remote
heads and ancestors; do not select a winner by timestamp or filename. Serialize
local operations and guard multiple tabs before enabling automatic sync. Remote
replacement must run conflict checks first and use the guarded storage path.

Tests use an in-memory Storage and fake transport; real browser quota, OAuth and
Drive integration remain phase 2 validation. Recovery has a programmatic API only;
no new UI or calculation changes are included.
