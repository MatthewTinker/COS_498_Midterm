const express = require('express');
const app = express();
const hbs = require('hbs');
const cookieParser = require('cookie-parser')
const path = require('path');
const PORT = process.env.PORT || 3001;

//Store data
const users = {}; //{ username: string, password: string }
const sessions = {}; //{ author: string, text: string, createdAt: Date }
const comments = []; //{ user: string, sessionId: string, expires: Date }

// Set up Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Middleware
app.use(express.json());
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));

// Remove static file serving - nginx will handle this
// app.use(express.static('public')); // Remove this line

// API Routes
// Note: We don't include '/api' in our routes because nginx strips it when forwarding
// nginx receives: http://localhost/api/users
// nginx forwards to: http://backend-nodejs:3000/users (without /api)
app.get('/', (req, res) => {
    res.json({ 
        message: 'Hello from the API!',
        timestamp: new Date().toISOString()
    });
});

app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/comments', (req, res) => {
    res.render('comments');
});

app.get('/comments/new', (req, res) => {
    res.render('new');
});


// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

