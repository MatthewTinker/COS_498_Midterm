const express = require('express');
const app = express();
const hbs = require('hbs');
const cookieParser = require('cookie-parser')
const path = require('path');
const PORT = process.env.PORT || 3000;
const db = require('./scripts/database.js');
//const db = require("./scripts/database.js");


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

//Passes the user into all pages
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});


// Import and use auth routes
const authRoutes = require('./routes/auth');
app.use('/', authRoutes(db));

//Import and use account routes
const accountRoutes = require('./routes/account');
app.use('/', accountRoutes(db));




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



//Render comments
//Note, things are special
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



// Graceful shutdown, throws warning if there is an error
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } 
        process.exit(0);
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});