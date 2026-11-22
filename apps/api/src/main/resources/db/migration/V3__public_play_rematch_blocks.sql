-- A rematch points at the drawing it came from. One rematch per drawing, so two artists
-- tapping "Draw again" at once end up in the same new drawing.
ALTER TABLE drawings ADD COLUMN rematch_of TEXT REFERENCES drawings (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX drawings_by_rematch_of ON drawings (rematch_of);

-- When the current turn began: set when a drawing starts, when someone folds, and when a new
-- artist takes the spot whose turn it is. Public drawings and rematches give each turn 12 hours.
ALTER TABLE drawings ADD COLUMN turn_started_at TEXT;
UPDATE drawings SET turn_started_at = created_at;

CREATE INDEX drawings_open_public ON drawings (visibility, finished_at);

-- Players never share a public drawing with someone they blocked (or who blocked them).
CREATE TABLE blocks (
    blocker_id  TEXT NOT NULL REFERENCES players (id),
    blocked_id  TEXT NOT NULL REFERENCES players (id),
    created_at  TEXT NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);
