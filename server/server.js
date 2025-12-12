const express = require('express');
const app = express();
const hbs = require('hbs');
const cookieParser = require('cookie-parser')
const path = require('path');
const PORT = process.env.PORT || 3000;
const db = require("./scripts/database.js");


// Set up Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));

// Helper for registration
hbs.registerHelper('formatDate', function(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
});

// Session middleware
app.use((req, res, next) => {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
        db.get(
            'SELECT username FROM sessions WHERE session_id = ?',
            [sessionId],
            (err, session) => {
                if (!err && session) {
                    req.user = session.username;
                }
                next();
            }
        );
    } else {
        next();
    }
});

// Creates session
function createSession(username, callback) {
    // Use an integer session ID counter
    db.get('SELECT MAX(session_id) as maxId FROM sessions', [], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        
        const sessionId = (row.maxId || 0) + 1;

        db.run(
            'INSERT INTO sessions (session_id, username) VALUES (?, ?)',
            [sessionId, username],
            (err) => {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, sessionId.toString());
                }
            }
        );
    });
}

// Log login attempt
function logLoginAttempt(username, ip, lockStatus, callback) {
    db.run(
        'INSERT INTO login (username, IP, lock_status) VALUES (?, ?, ?)',
        [username, ip, lockStatus],
        callback
    );
}

//App Get requests, almost all follow the same format
app.get('/', (req, res) => {
    res.render('home', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});

app.get('/home', (req, res) => {
    res.render('home', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});

app.get('/register', (req, res) => {
    res.render('register', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});

app.get('/login', (req, res) => {
    res.render('login', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});

app.get('/comments', (req, res) => {
    db.all(
        'SELECT author, body, timestamps FROM comments ORDER BY timestamps DESC',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching comments:', err);
                rows = [];
            }
            
            // Transform database results to match template expectations
            const formattedComments = rows.map(c => ({
                author: c.author,
                text: c.body,
                createdAt: c.timestamps
            }));

            res.render('comments', { 
                title: "Comments", 
                user: req.user || null, 
                year: new Date().getFullYear(),
                comments: formattedComments
            });
        }
    );
});

app.get('/comments/new', (req, res) => {
    res.render('new', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});
// Logout
app.get('/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
        db.run('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
    }

    res.clearCookie("sessionId");
    res.redirect("/");
});

// App Post Requests

// Register page
app.post('/register', (req, res) => {
    const { username, password, email, display_name } = req.body;

    // Check if user already exists
    db.get('SELECT username FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.render('register', {
                error: "Database error occurred",
                year: new Date().getFullYear()
            });
        }

        if (user) {
            return res.render('register', {
                error: "Username already taken",
                year: new Date().getFullYear()
            });
        }

        // Insert new user
        db.run(
            'INSERT INTO users (username, pass, email, display_name, account_lock) VALUES (?, ?, ?, ?, ?)',
            [username, password, email || username + '@example.com', display_name || username, 0],
            function(err) {
                if (err) {
                    return res.render('register', {
                        error: "Error creating account",
                        year: new Date().getFullYear()
                    });
                }

                // Log the registration
                logLoginAttempt(username, req.ip, 0, () => {});

                // Create session
                createSession(username, (err, sessionId) => {
                    if (err) {
                        return res.redirect('/login');
                    }

                    res.cookie('sessionId', sessionId);
                    res.redirect('/comments');
                });
            }
        );
    });
});

// Login page
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
        'SELECT username, pass, account_lock FROM users WHERE username = ?',
        [username],
        (err, user) => {
            if (err || !user || user.pass !== password) {
                // Log failed login attempt
                if (username) {
                    logLoginAttempt(username, req.ip, 1, () => {});
                }

                return res.render('login', {
                    error: "Invalid username or password",
                    year: new Date().getFullYear()
                });
            }

            if (user.account_lock === 1) {
                return res.render('login', {
                    error: "Account is locked",
                    year: new Date().getFullYear()
                });
            }

            // Log successful login
            logLoginAttempt(username, req.ip, 0, () => {});

            // Create session
            createSession(username, (err, sessionId) => {
                if (err) {
                    return res.render('login', {
                        error: "Error creating session",
                        year: new Date().getFullYear()
                    });
                }

                res.cookie('sessionId', sessionId);
                res.redirect('/comments');
            });
        }
    );
});

// Post comments
app.post('/comments', (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    const { text } = req.body;

    if (!text) {
        return res.redirect('/comments/new');
    }

    db.run(
        'INSERT INTO comments (author, body) VALUES (?, ?)',
        [req.user, text],
        (err) => {
            if (err) {
                console.error('Error posting comment:', err);
            }
            res.redirect('/comments');
        }
    );
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});