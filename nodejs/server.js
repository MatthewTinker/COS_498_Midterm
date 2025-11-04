const express = require('express');
const app = express();
const hbs = require('hbs');
const PORT = process.env.PORT || 3000;

// Set up Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
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

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'nodejs-backend'
    });
});

app.get('/home', (req, res) => {
});

app.get('/register', (req, res) => {
});

app.get('/login', (req, res) => {
});

app.get('/comments', (req, res) => {
});

app.get('/comments/new', (req, res) => {
});


// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

