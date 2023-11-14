const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri);

(async () => {
    try {
        await client.connect();
    console.log('koneksi mongodb berhasil')
    } catch (error) {
        console.log('Koneksi Error : ' + error);
    }
})();

const db = client.db('readdream');

module.exports = db;