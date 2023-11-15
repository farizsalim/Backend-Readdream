const express = require('express');
const routes = require('./routes/routes');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));


// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.get('/thumbnail/:filename', (req, res) => {
    const { filename } = req.params;
    res.sendFile(path.join(__dirname, 'public', 'thumbnail', filename));
});

app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/server/apiReaddream', routes);

// 404 Not Found middleware
app.use((req, res, next) => {
    res.status(404).json({
        status: 'failed',
        message: req.originalUrl + ' not found',
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        error: err.message,
    });
});

// Start the server
const port = 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
