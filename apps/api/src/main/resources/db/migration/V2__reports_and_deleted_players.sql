-- "Delete my data": the row stays so finished drawings keep their shape, but the name,
-- push token and token are wiped (see PlayerRepository.anonymize).
ALTER TABLE players ADD COLUMN deleted_at TEXT;

-- Someone in a drawing flagged it. One report per player per drawing.
CREATE TABLE reports (
    drawing_id   TEXT NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    reporter_id  TEXT NOT NULL REFERENCES players (id),
    reason       TEXT,
    created_at   TEXT NOT NULL,
    PRIMARY KEY (drawing_id, reporter_id)
);
