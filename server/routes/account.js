const express = require('express');

module.exports = function (db) {
    const router = express.Router();

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
                    console.error('Profile lookup failed:', err);
                    return res.redirect('/');
                }

                res.render('profile', {
                    title: 'Profile',
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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Invalid email
        if (!emailRegex.test(email)) {
            return renderProfileWithError(
                res,
                db,
                req.user,
                'Please enter a valid email address'
            );
        }

        // Display name same as username
        if (display_name.toLowerCase() === req.user.toLowerCase()) {
            return renderProfileWithError(
                res,
                db,
                req.user,
                'Display name must be different from username'
            );
        }

        // Check if email is taken
        db.get(
            'SELECT username FROM users WHERE email = ? AND username != ?',
            [email, req.user],
            (err, existingUser) => {
                if (existingUser) {
                    return renderProfileWithError(
                        res,
                        db,
                        req.user,
                        'Email already in use by another account'
                    );
                }

                // Update profile
                db.run(
                    'UPDATE users SET email = ?, display_name = ? WHERE username = ?',
                    [email, display_name, req.user],
                    (err) => {
                        if (err) {
                            console.error('Error updating profile:', err);
                            return renderProfileWithError(
                                res,
                                db,
                                req.user,
                                'Error updating profile'
                            );
                        }

                        // Success - fetch updated user data
                        db.get(
                            'SELECT username, email, display_name FROM users WHERE username = ?',
                            [req.user],
                            (err, user) => {
                                res.render('profile', {
                                    title: 'Profile',
                                    user: req.user,
                                    userProfile: user,
                                    success: 'Profile updated successfully!',
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

/**
 * Helper to re-render profile with an error message
 */
function renderProfileWithError(res, db, username, error) {
    db.get(
        'SELECT username, email, display_name FROM users WHERE username = ?',
        [username],
        (err, user) => {
            res.render('profile', {
                title: 'Profile',
                user: username,
                userProfile: user,
                error,
                year: new Date().getFullYear()
            });
        }
    );
}