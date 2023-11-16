const express = require('express');
const routes = require('./routes/routes'); // Pastikan path sesuai dengan struktur proyek Anda
const cors = require('cors');

const app = express();

app.use(cors());
const PORT = 8800;

app.use(express.json());

app.use('/server/apiReaddream', routes);

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
