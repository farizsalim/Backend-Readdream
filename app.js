const express = require('express');
const routes = require('./routes/routes');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware untuk mengizinkan CORS
app.use(cors());

// Middleware untuk mengizinkan penguraian body dari JSON
app.use(express.json());

// Middleware untuk mengizinkan penguraian body dari URL-encoded
app.use(express.urlencoded({ extended: true }));

// Endpoint untuk mengirim file thumbnail
app.get('/thumbnail/:filename', (req, res) => {
    const { filename } = req.params;
    res.sendFile(path.join(__dirname, 'public', 'thumbnail', filename));
});

// Middleware CORS khusus untuk endpoint /server/apiReaddream
app.use('/server/apiReaddream', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://frontend-readdream.vercel.app/');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Endpoint untuk API Anda
app.use('/server/apiReaddream', routes);

// Middleware untuk menangani 404 Not Found
app.use((req, res, next) => {
    res.status(404).send({
        status: "failed",
        message: req.originalUrl + ' not found'
    });
});

// Middleware untuk menangani kesalahan server
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({
        status: "error",
        message: "Internal Server Error"
    });
});

const port = 3000;

app.listen(port, () => console.log(`Server berjalan di http://localhost:${port}`));
