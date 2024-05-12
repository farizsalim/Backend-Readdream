const multer = require('multer');
const { ObjectId } = require('bson');
const db = require('../config/mongodb');
const { drive } = require('../config/googleapi');
const streamifier = require('streamifier');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const bufferToStream = (buffer) => {
    const stream = streamifier.createReadStream(buffer);
    return stream;
};

const addChapter = async (req, res) => {
    try {
        const { id } = req.params;
        const { judulChapter, nomorChapter, daftarGambar } = req.body;

        const komik = await db.collection('komik').findOne({ _id: new ObjectId(id) });

        if (!komik) {
            return res.status(404).json({ error: 'Komik tidak ditemukan' });
        }

        const newChapter = {
            _id: new ObjectId(),
            judulChapter,
            nomorChapter,
            daftarGambar,
            created_at: new Date(),
        };

        await db.collection('komik').updateOne(
            { _id: new ObjectId(id) },
            { $push: { chapter: newChapter } }
        );

        res.status(201).json({ message: 'Chapter berhasil ditambahkan', chapter: newChapter });
    } catch (error) {
        console.error('Error saat menambahkan chapter:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan chapter' });
    }
};

const getChapterById = async (req, res) => {
    const komikId = req.params.id;
    const chapterId = req.params.chapterId;

    if (!komikId) {
        return res.status(400).send("ID komik tidak valid");
    }
    if(!chapterId){
        return res.status(400).send("ID chapter tidak valid");
    }

    try {
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });

        if (!komik) {
            return res.status(404).send("Komik tidak ditemukan");
        }

        const chapter = komik.chapter.find(chap => chap._id.toString() === chapterId);

        if (!chapter) {
            return res.status(404).send("Chapter tidak ditemukan");
        }

        res.send(chapter);
    } catch (error) {
        console.error("Error fetching chapter by ID:", error);
        res.status(500).send("Gagal mengambil chapter");
    }
};

const addGambar = async (req, res) => {
    const komikId = req.params.id;
    const chapterId = req.params.chapterId;

    if (!komikId || !chapterId) {
        return res.status(400).send("ID komik atau ID chapter tidak valid");
    }

    const { nomorGambar } = req.body;

    try {
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });

        if (!komik) {
            return res.status(404).send("Komik tidak ditemukan");
        }

        const chapter = komik.chapter.find(chap => chap._id.toString() === chapterId);

        if (!chapter) {
            return res.status(404).send("Chapter tidak ditemukan");
        }

        if (!chapter.daftarGambar) {
            chapter.daftarGambar = [];
        }

        upload.single('gambar')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(500).send(err);
            } else if (err) {
                return res.status(500).send(err);
            }

            const fileName = req.file.originalname;
            const fileBuffer = req.file.buffer;

            try {
                const { data } = await drive.files.create({
                    requestBody: {
                        name: fileName,
                        mimeType: 'image/jpeg',
                        parents: ['1uHsKzuioulpd5Qz1Yq3IKobXGaHALA_j'],
                    },
                    media: {
                        mimeType: 'image/jpeg',
                        body: bufferToStream(fileBuffer),
                    },
                });

                const googleDriveId = data.id;

                // Set permissions for the file (make it public)
                await drive.permissions.create({
                    fileId: googleDriveId,
                    requestBody: {
                        role: 'reader', // Change to 'writer' if you want others to be able to edit
                        type: 'anyone',
                    },
                });

                const gambarObj = {
                    _id: new ObjectId(),
                    idGambar: googleDriveId,
                    nomorGambar: nomorGambar,
                    gambar: `https://drive.google.com/thumbnail?id=${googleDriveId}&sz=w1000`,
                };

                chapter.daftarGambar.push(gambarObj);

                const result = await db.collection('komik').updateOne(
                    { _id: new ObjectId(komikId), 'chapter._id': new ObjectId(chapterId) },
                    { $set: { 'chapter.$.daftarGambar': chapter.daftarGambar } }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).send("Chapter tidak ditemukan saat menambah gambar");
                }

                res.send("Gambar berhasil ditambahkan");
            } catch (error) {
                console.error('Error adding gambar to Google Drive:', error);
                res.status(500).send("Gagal menambahkan gambar");
            }
        });
    } catch (error) {
        console.error("Error adding gambar:", error);
        res.status(500).send("Gagal menambahkan gambar");
    }
};

const deleteGambar = async (req, res) => {
    const komikId = req.params.id;
    const chapterId = req.params.chapterId;
    const gambarId = req.params.gambarId;

    if (!komikId || !chapterId || !gambarId) {
        return res.status(400).send("ID komik, ID chapter, atau ID gambar tidak valid");
    }

    try {
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });

        if (!komik) {
            return res.status(404).send("Komik tidak ditemukan");
        }

        const chapter = komik.chapter.find(chap => chap._id.toString() === chapterId);

        if (!chapter) {
            return res.status(404).send("Chapter tidak ditemukan");
        }

        const gambarIndex = chapter.daftarGambar.findIndex(gambar => gambar._id.toString() === gambarId);

        if (gambarIndex === -1) {
            return res.status(404).send("Gambar tidak ditemukan");
        }

        const gambar = chapter.daftarGambar[gambarIndex];

        // Delete the file from Google Drive using idGoogle
        await drive.files.delete({
            fileId: gambar.idGambar,
        });

        // Remove the gambar from the chapter's daftarGambar array
        chapter.daftarGambar.splice(gambarIndex, 1);

        // Update the chapter in the database
        const result = await db.collection('komik').updateOne(
            { _id: new ObjectId(komikId), 'chapter._id': new ObjectId(chapterId) },
            { $set: { 'chapter.$.daftarGambar': chapter.daftarGambar } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send("Chapter tidak ditemukan saat menghapus gambar");
        }

        res.send("Gambar berhasil dihapus");
    } catch (error) {
        console.error("Error deleting gambar:", error);
        res.status(500).send("Gagal menghapus gambar");
    }
};

const getChapterByNumber = async (req, res) => {
    const komikId = req.params.id;
    const nomorChapter = req.params.nomorChapter;

    if (!komikId || !nomorChapter) {
        return res.status(400).send("ID komik atau nomorChapter tidak valid");
    }

    try {
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });

        if (!komik) {
            return res.status(404).send("Komik tidak ditemukan");
        }

        const chapter = komik.chapter.find(chap => chap.nomorChapter === nomorChapter);

        if (!chapter) {
            return res.status(404).send("Chapter tidak ditemukan");
        }

        res.send(chapter);
    } catch (error) {
        console.error("Error fetching chapter by nomorChapter:", error);
        res.status(500).send("Gagal mengambil chapter");
    }
};

module.exports = { addChapter, getChapterById, addGambar, deleteGambar, getChapterByNumber};
