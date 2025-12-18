const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // Get chat history
    router.get('/api/chat', (req, res) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        db.all(
            `SELECT display_name, message, created_at
             FROM chat_messages
             ORDER BY created_at ASC
             LIMIT 100`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Chat DB error:', err);
                    return res.status(500).json({ error: 'DB error' });
                }
                res.json(rows);
            }
        );
    });

    // REST fallback for sending messages
    router.post('/api/chat', (req, res) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Empty message' });
        }

        db.get(
            'SELECT display_name FROM users WHERE username = ?',
            [req.user],
            (err, user) => {
                if (err || !user) {
                    return res.status(500).json({ error: 'User lookup failed' });
                }

                db.run(
                    `INSERT INTO chat_messages (username, display_name, message)
                     VALUES (?, ?, ?)`,
                    [req.user, user.display_name, message],
                    () => res.json({ success: true })
                );
            }
        );
    });

    return router;
};
