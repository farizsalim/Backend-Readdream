const express = require('express');
const routes = require('./routes/routes');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
    res.status(404).send({
        status: 'failed',
        message: req.originalUrl + ' not found',
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({
        status: 'error',
        message: 'Internal Server Error',
    });
});

// Start the server
const port = 3000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
