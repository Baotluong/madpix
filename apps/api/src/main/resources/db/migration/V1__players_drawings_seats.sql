-- Anonymous players: a random token on the device, only its hash here.
CREATE TABLE players (
    id          TEXT PRIMARY KEY,
    token_hash  TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    push_token  TEXT,
    created_at  TEXT NOT NULL
);

-- One drawing = one folded page. Private for now; public drawings come later.
CREATE TABLE drawings (
    id            TEXT PRIMARY KEY,
    invite_code   TEXT NOT NULL UNIQUE,
    visibility    TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    artist_count  INTEGER NOT NULL CHECK (artist_count BETWEEN 2 AND 4),
    strip_h       INTEGER NOT NULL,
    prompt        TEXT,
    created_by    TEXT NOT NULL REFERENCES players (id),
    created_at    TEXT NOT NULL,
    finished_at   TEXT
);

-- A seat is one strip of the page. Seats fill in join order; position 0 is the creator.
-- strokes is JSON, set when the artist folds their strip.
CREATE TABLE seats (
    drawing_id    TEXT NOT NULL REFERENCES drawings (id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    player_id     TEXT NOT NULL REFERENCES players (id),
    joined_at     TEXT NOT NULL,
    strokes       TEXT,
    submitted_at  TEXT,
    PRIMARY KEY (drawing_id, position),
    UNIQUE (drawing_id, player_id)
);

CREATE INDEX seats_by_player ON seats (player_id);
