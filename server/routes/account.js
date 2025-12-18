const express = require('express');
const {
    validatePassword,
    hashPassword,
    comparePassword
} = require('../modules/password-utils');

module.exports = function (db) {
    const router = express.Router();

    const ALLOWED_COLORS = [
        'hsla(226, 71%, 40%, 1.00)',
        '#dc2626', '#16a34a', '#9333ea',
        '#ea580c', '#0891b2', '#ca8a04',
        '#e11d48', '#4f46e5', '#059669',
        '#d97706', '#7c3aed'
    ];

    /* ===================== GET PROFILE ===================== */
    router.get('/profile', (req, res) => {
        if (!req.user) return res.redirect('/login');

        render(res, db, req.user);
    });

    /* ===================== UPDATE PROFILE ===================== */
    router.post('/profile/update', async (req, res) => {
        if (!req.user) return res.redirect('/login');

        const { email, display_name, name_color, current_password } = req.body;

        if (!current_password) {
            return render(res, db, req.user, 'Current password is required');
        }

        if (!display_name || display_name.trim().length === 0) {
            return render(res, db, req.user, 'Display name cannot be empty');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return render(res, db, req.user, 'Invalid email address');
        }

        const cleanColor = ALLOWED_COLORS.includes(name_color)
            ? name_color
            : ALLOWED_COLORS[0];

        db.get(
            'SELECT pass FROM users WHERE username = ?',
            [req.user],
            async (err, user) => {
                if (err || !user) {
                    return render(res, db, req.user, 'Authentication error');
                }

                const valid = await comparePassword(current_password, user.pass);
                if (!valid) {
                    return render(res, db, req.user, 'Current password is incorrect');
                }

                db.run(
                    `UPDATE users
                     SET email = ?, display_name = ?, name_color = ?
                     WHERE username = ?`,
                    [email, display_name.trim(), cleanColor, req.user],
                    err => {
                        if (err) {
                            console.error(err);
                            return render(res, db, req.user, 'Failed to update profile');
                        }

                        render(res, db, req.user, null, 'Profile updated successfully');
                    }
                );
            }
        );
    });

    /* ===================== CHANGE PASSWORD ===================== */
    router.post('/profile/change-password', async (req, res) => {
        if (!req.user) return res.redirect('/login');

        const { current_password, new_password, confirm_password } = req.body;

        if (!current_password || !new_password || !confirm_password) {
            return render(res, db, req.user, 'All password fields are required');
        }

        if (new_password !== confirm_password) {
            return render(res, db, req.user, 'Passwords do not match');
        }

        const validation = validatePassword(new_password);
        if (!validation.valid) {
            return render(res, db, req.user, validation.errors.join('. '));
        }

        db.get(
            'SELECT pass FROM users WHERE username = ?',
            [req.user],
            async (err, user) => {
                if (err || !user) {
                    return render(res, db, req.user, 'Authentication error');
                }

                const valid = await comparePassword(current_password, user.pass);
                if (!valid) {
                    return render(res, db, req.user, 'Current password is incorrect');
                }

                const hashed = await hashPassword(new_password);

                db.run(
                    'UPDATE users SET pass = ? WHERE username = ?',
                    [hashed, req.user],
                    err => {
                        if (err) {
                            console.error(err);
                            return render(res, db, req.user, 'Failed to update password');
                        }

                        db.run('DELETE FROM sessions WHERE username = ?', [req.user]);
                        res.clearCookie('sessionId');
                        res.redirect('/login?message=Password changed successfully');
                    }
                );
            }
        );
    });

    return router;
};

/* ===================== RENDER HELPER ===================== */
function render(res, db, username, error = null, success = null) {
    db.get(
        `SELECT username, email, display_name, name_color
         FROM users WHERE username = ?`,
        [username],
        (err, user) => {
            if (err || !user) {
                return res.redirect('/');
            }

            res.render('account', {
                title: 'Profile Settings',
                user: username,
                userProfile: user,
                error,
                success,
                year: new Date().getFullYear()
            });
        }
    );
}
