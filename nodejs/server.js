const express = require('express');
const app = express();
const hbs = require('hbs');
const cookieParser = require('cookie-parser')
const path = require('path');
const PORT = process.env.PORT || 3000;

//Store data
const users = {}; //{ username: string, password: string }
const sessions = {}; //{ author: string, text: string, createdAt: Date }
const comments = []; //{ user: string, sessionId: string, expires: Date }

// Set up Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));

hbs.registerHelper('formatDate', function(date) {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour : 'numeric',
        minute: '2-digit'
    })
})


//Create cookies
app.use((req, _res, next) => {
    const sessionId = req.cookies.sessionId;

    if (sessionId && sessions[sessionId]) {
        const session = sessions[sessionId];

        if (session.expires > new Date()) {
            req.user = session.user;
        }

    }

    next()
})

let sessionCounter = 0;

function createSession(username) {

    const sessionId = sessionCounter.toString();

    sessions[sessionId] = {
        user: username,
        sessionId: sessionId,
        expires: new Date(Date.now() + 3600000)
    };

    sessionCounter++;
    return sessionId;
}


//App Get requests
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
    res.render('comments', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});

app.get('/comments/new', (req, res) => {
    res.render('new', { title: "Home", user: req.user || null, year: new Date().getFullYear() });
});

app.get('/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
        delete sessions[sessionId]
    }

    res.clearCookie("sessionId")
    res.redirect("/")

})



//App Post Requests
app.post('/register', (req, res) => {

    const {username, password} = req.body;

    if (users[username]) {
        return res.render('register', {
            error: "Username already taken"
        })
    }

    const sessionId = createSession(username);
    users[username] = {username, password}

    res.cookie('sessionId', sessionId)
    res.redirect('/comments')

})

app.post('/login', (req, res) => {

    const { username, password } = req.body;

    if (!users[username] || users[username].password != password) {
        return res.render('login', {
            error: "Invalid username or password"
        });
    }

    const sessionId = createSession(username);
    res.cookie('sessionId', sessionId);

    res.redirect('/comments')

})

app.post('/comments', (req, res) => {
    
    const text = req.body.text;
    const author = req.user;

    if (!author) {
        return res.redirect('/login');
    }

    comments.push({
        author: author,
        text: text,
        createdAt: new Date()
    });
    
    res.redirect('/comments');

})



// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});