const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('bson');
const db = require('../config/mongodb');

const secretKey = 'your-secret-key';

const getAllUser = (req, res) => {
    db.collection('users').find().toArray()
        .then(result => res.send(result))
        .catch(error => res.status(500).send(error));
};

const register = async (req, res) => {
    const { username, email, password, role, status } = req.body;

    if (!username || !email || !password) {
        return res.status(400).send("Data tidak lengkap");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = 'user';
    const newUser = {
        _id: new ObjectId(),
        username,
        email,
        password: hashedPassword,
        role: role || defaultRole,
        status
    };

    db.collection('users').insertOne(newUser)
        .then(result => res.send(result.ops[0]))
        .catch(error => res.status(500).send(error));
};


const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Data tidak lengkap");
    }

    const user = await db.collection('users').findOne({ username });

    if (!user) {
        return res.status(404).send("Pengguna tidak ditemukan");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.status(401).send("Password salah");
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, secretKey, { expiresIn: '1h' });

    res.json({ token });
};

module.exports = { getAllUser, register, login };
