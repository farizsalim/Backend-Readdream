const express = require('express');
const routes = require('./routes/routes');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/thumbnail/:filename', (req, res) => {
    const { filename } = req.params;
    res.sendFile(path.join(__dirname, 'public', 'thumbnail', filename));
  });

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/server/apiReaddream', routes);

app.use((req, res, next) => {
    res.status(404).send({
        status: "failed",
        message: req.originalUrl + ' not found'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({
        status: "error",
        message: "Internal Server Error"
    });
});

app.listen(port = 30000, () => console.log(`Server: http://localhost:${port}`));
