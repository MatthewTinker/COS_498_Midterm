const express = require('express');
const router = express.Router();

module.exports = function(db) {
    // GET profile/settings page
    router.get('/profile', (req, res) => {
        if (!req.user) {
            return res.redirect('/login');
        }

        db.get(
            'SELECT username, email, display_name FROM users WHERE username = ?',
            [req.user],
            (err, user) => {
                if (err || !user) {
                    return res.redirect('/');
                }

                res.render('profile', {
                    title: "Profile",
                    user: req.user,
                    userProfile: user,
                    year: new Date().getFullYear()
                });
            }
        );
    });

    // POST update profile
    router.post('/profile', (req, res) => {
        if (!req.user) {
            return res.redirect('/login');
        }

        const { email, display_name } = req.body;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return db.get(
                'SELECT * FROM users WHERE username = ?',
                [req.user],
                (err, user) => {
                    res.render('profile', {
                        title: "Profile",
                        user: req.user,
                        userProfile: user,
                        error: "Please enter a valid email address",
                        year: new Date().getFullYear()
                    });
                }
            );
        }

        // Validate display name is different from username
        if (display_name.toLowerCase() === req.user.toLowerCase()) {
            return db.get(
                'SELECT * FROM users WHERE username = ?',
                [req.user],
                (err, user) => {
                    res.render('profile', {
                        title: "Profile",
                        user: req.user,
                        userProfile: user,
                        error: "Display name must be different from username",
                        year: new Date().getFullYear()
                    });
                }
            );
        }

        // Check if email is already taken
        db.get(
            'SELECT username FROM users WHERE email = ? AND username != ?',
            [email, req.user],
            (err, existingUser) => {
                if (existingUser) {
                    return db.get(
                        'SELECT * FROM users WHERE username = ?',
                        [req.user],
                        (err, user) => {
                            res.render('profile', {
                                title: "Profile",
                                user: req.user,
                                userProfile: user,
                                error: "Email already in use by another account",
                                year: new Date().getFullYear()
                            });
                        }
                    );
                }

                // Update profile
                db.run(
                    'UPDATE users SET email = ?, display_name = ? WHERE username = ?',
                    [email, display_name, req.user],
                    (err) => {
                        if (err) {
                            console.error('Error updating profile:', err);
                            return db.get(
                                'SELECT * FROM users WHERE username = ?',
                                [req.user],
                                (err, user) => {
                                    res.render('profile', {
                                        title: "Profile",
                                        user: req.user,
                                        userProfile: user,
                                        error: "Error updating profile",
                                        year: new Date().getFullYear()
                                    });
                                }
                            );
                        }

                        // Success
                        db.get(
                            'SELECT * FROM users WHERE username = ?',
                            [req.user],
                            (err, user) => {
                                res.render('profile', {
                                    title: "Profile",
                                    user: req.user,
                                    userProfile: user,
                                    success: "Profile updated successfully!",
                                    year: new Date().getFullYear()
                                });
                            }
                        );
                    }
                );
            }
        );
    });

    return router;
};