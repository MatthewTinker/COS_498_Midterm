const express = require('express');

module.exports = function () {
    const router = express.Router();

    // Render chat page
    router.get('/chat', (req, res) => {
        if (!req.user) {
            return res.redirect('/login');
        }

        res.render('chat', {
            title: 'Chat',
            user: req.user
        });
    });

    return router;
};
