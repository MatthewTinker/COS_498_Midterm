const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const hbs = require('hbs');
const cookieParser = require('cookie-parser')
const path = require('path');
const PORT = process.env.PORT || 3000;
const db = require('./scripts/database.js');


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

hbs.registerHelper('eq', function(a, b) {
    return a === b;
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

io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
        socket.username = null;
        return next();
    }

    const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
    );

    const sessionId = cookies.sessionId;
    if (!sessionId) {
        socket.username = null;
        return next();
    }

    db.get(
        'SELECT username FROM sessions WHERE session_id = ?',
        [sessionId],
        (err, session) => {
            if (!err && session) {
                socket.username = session.username;
            } else {
                socket.username = null;
            }
            next();
        }
    );
});

io.on('connection', (socket) => {
    socket.on('chatMessage', (message) => {
        if (!socket.username) return; // ignore unauthenticated

        if (!message || !message.trim()) return;

        db.get(
            'SELECT display_name FROM users WHERE username = ?',
            [socket.username],
            (err, user) => {
                if (err || !user) return;

                db.run(
                    `INSERT INTO chat_messages (username, display_name, message)
                     VALUES (?, ?, ?)`,
                    [socket.username, user.display_name, message],
                    function () {
                        io.emit('chatMessage', {
                            display_name: user.display_name,
                            message,
                            created_at: new Date().toISOString()
                        });
                    }
                );
            }
        );
    });
});




app.use((req, res, next) => {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) return next();

    db.get(
        'SELECT username FROM sessions WHERE session_id = ?',
        [sessionId],
        (err, session) => {
            if (err) {
                console.error('Session lookup failed:', err);
                return next(); // NEVER block the request
            }

            if (session) {
                req.user = session.username;
            }

            next(); // ALWAYS called
        }
    );
});



// Import and use auth routes
const authRoutes = require('./routes/auth');
app.use('/', authRoutes(db));

// Import and use account routes
const accountRoutes = require('./routes/account');
app.use('/', accountRoutes(db));

// Import and use chat routes
const chatRoutes = require('./routes/chat');
app.use('/', chatRoutes(io, db));



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

app.get('/chat', (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.render('chat', { title: 'Chat', user: req.user });
});




//Render comments
app.get('/comments', (req, res) => {
    db.all(
        `
        SELECT 
            c.body,
            c.timestamps,
            u.display_name,
            u.name_color
        FROM comments c
        JOIN users u ON c.author = u.username
        ORDER BY c.timestamps DESC
        `,
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching comments:', err);
                return res.render('comments', {
                    title: "Comments",
                    user: req.user || null,
                    year: new Date().getFullYear(),
                    comments: []
                });
            }

            const formattedComments = rows.map(c => ({
                display_name: c.display_name,
                name_color: c.name_color || '#000000',
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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});