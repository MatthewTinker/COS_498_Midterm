const express = require('express');
const router = express.Router();

// If db is exported from another file, require it here
const db = require('../db'); // adjust path if needed

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
