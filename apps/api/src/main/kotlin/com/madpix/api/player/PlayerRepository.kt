package com.madpix.api.player

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

@Repository
class PlayerRepository(private val jdbc: JdbcClient) {

    fun create(id: String, tokenHash: String, name: String, now: Instant) {
        jdbc.sql("INSERT INTO players (id, token_hash, name, created_at) VALUES (?, ?, ?, ?)")
            .params(id, tokenHash, name, now.toString())
            .update()
    }

    fun findByTokenHash(tokenHash: String): Player? =
        jdbc.sql("SELECT id, name, push_token FROM players WHERE token_hash = ?")
            .param(tokenHash)
            .query { rs, _ -> rs.toPlayer() }
            .optional()
            .orElse(null)

    fun findById(id: String): Player? =
        jdbc.sql("SELECT id, name, push_token FROM players WHERE id = ?")
            .param(id)
            .query { rs, _ -> rs.toPlayer() }
            .optional()
            .orElse(null)

    fun findByIds(ids: Collection<String>): List<Player> =
        if (ids.isEmpty()) {
            emptyList()
        } else {
            jdbc.sql("SELECT id, name, push_token FROM players WHERE id IN (:ids)")
                .param("ids", ids)
                .query { rs, _ -> rs.toPlayer() }
                .list()
        }

    fun update(id: String, name: String?, pushToken: String?) {
        jdbc.sql(
            """
            UPDATE players
            SET name = COALESCE(:name, name), push_token = COALESCE(:pushToken, push_token)
            WHERE id = :id
            """,
        )
            .param("id", id)
            .param("name", name)
            .param("pushToken", pushToken)
            .update()
    }

    /**
     * "Delete my data": forgets the name, push token and login. The row itself stays, so strips
     * this player already folded keep their place in friends' drawings, as "Deleted artist".
     */
    fun anonymize(id: String, now: Instant) {
        jdbc.sql(
            """
            UPDATE players
            SET name = :name, push_token = NULL, token_hash = :tokenHash, deleted_at = :now
            WHERE id = :id
            """,
        )
            .param("id", id)
            .param("name", DELETED_NAME)
            // Not a SHA-256 hex string, so no token can ever match it again.
            .param("tokenHash", "deleted:$id")
            .param("now", now.toString())
            .update()
    }

    private fun ResultSet.toPlayer() = Player(getString("id"), getString("name"), getString("push_token"))
}

const val DELETED_NAME = "Deleted artist"
