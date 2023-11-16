const crypto = require('crypto');
const { ObjectId } = require('bson');
const db = require('../config/mongodb');
const { drive } = require('../config/googleapi');
const multer = require('multer');
const streamifier = require('streamifier');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const bufferToStream = (buffer) => {
    const stream = streamifier.createReadStream(buffer);
    return stream;
};

const getAllKomik = (req, res) => {
    db.collection('komik').find().toArray()
        .then(result => res.send(result))
        .catch(error => res.status(500).send(error));
};


const addKomik = async (req, res) => {
    try {
        const upload = multer(/* konfigurasi multer Anda */);

        upload.array('thumbnail', 1)(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: 'Terjadi kesalahan pada upload file' });
            } else if (err) {
                return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
            }

            console.log('Request Body:', req.body);
            console.log('Request Files:', req.files);

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'File tidak ditemukan' });
            }

            if (!req.files[0].originalname || !req.files[0].buffer) {
                return res.status(400).json({ error: 'File tidak ditemukan' });
            }

            const { judul, author, deskripsi, jenis_komik, genre, status, uploader, rating } = req.body;

            console.log('Parsed Body:', {
                judul,
                author,
                deskripsi,
                jenis_komik,
                genre,
                status,
                uploader,
                rating,
            });

            const genreArray = genre ? genre.split(',').map((genreItem) => genreItem.trim()) : [];

            const newKomik = {
                _id: new ObjectId(),
                judul,
                author,
                deskripsi,
                jenis_komik,
                genre: genreArray,
                status,
                uploader,
                chapter: [],
                rating,
                created_at: new Date(),
            };

            console.log('New Komik:', newKomik);

            const result = await db.collection('komik').insertOne(newKomik);

            console.log('Result after MongoDB insertion:', result);

            const fileNameHash = crypto.createHash('md5').update(req.files[0].originalname).digest('hex');

            const { data } = await drive.files.create({
                requestBody: {
                    name: fileNameHash + '.' + req.files[0].originalname.split('.').pop(),
                    mimeType: req.files[0].mimetype,
                    parents: ['1d4_5nkRy_G4x7e4trYgG46VxU1TIBUX4'],
                },
                media: {
                    mimeType: req.files[0].mimetype,
                    body: bufferToStream(req.files[0].buffer),
                },
            });

            console.log('Thumbnail Google Drive Response:', data);

            // Set permissions for the file (make it public)
            const fileId = data.id;
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader', // Ubah ke 'writer' jika Anda ingin orang lain dapat mengedit
                    type: 'anyone',
                },
            });

            // Update the MongoDB entry with the public link
            await db.collection('komik').updateOne(
                { _id: result.insertedId },
                { $set: { thumbnail: `https://drive.google.com/uc?export=view&id=${data.id}`,
                          thumbnailID:  data.id} }
            );

            res.status(201).json({
                message: 'Komik berhasil ditambahkan',
                thumbnailGoogleDriveId: data.id,
            });
        });
    } catch (error) {
        console.error('Error saat menambahkan komik:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan komik' });
    }
};


const deleteKomik = async (req, res) => {
    try {
        const { id } = req.params; // Ambil ID komik dari parameter URL
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(id) });

        if (!komik) {
            return res.status(404).json({ error: 'Komik tidak ditemukan' });
        }

        

        // Hapus komik dari MongoDB
        const result = await db.collection('komik').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
            // Iterate through chapters and delete images from Google Drive
            for (const chapter of komik.chapter) {
                for (const gambar of chapter.daftarGambar) {
                    await drive.files.delete({ fileId: gambar.idGambar });
                }
            }
            if (komik.thumbnailID) {
                await drive.files.delete({ fileId: komik.thumbnailID });
            }
            return res.json({ message: 'Komik berhasil dihapus' });
        } else {
            return res.status(500).json({ error: 'Terjadi kesalahan saat menghapus komik' });
        }


        // Hapus file dari Google Drive berdasarkan thumbnailID
        

    } catch (error) {
        console.error('Error saat menghapus komik:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menghapus komik' });
    }
};

const updateKomik = async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, author, deskripsi, jenis_komik, genre, status, rating } = req.body;

        const komik = await db.collection('komik').findOne({ _id: new ObjectId(id) });

        if (!komik) {
            return res.status(404).json({ error: 'Komik tidak ditemukan' });
        }

        let thumbnailURL = komik.thumbnail;
        let thumbnailID = komik.thumbnailID;

        // Update thumbnail di Google Drive jika ada file yang diupload
        if (req.files && req.files.length > 0) {
            try {
                // Hapus thumbnail yang sudah ada dari Google Drive jika thumbnailID sudah tersedia
                if (thumbnailID) {
                    await drive.files.delete({ fileId: thumbnailID });
                }

                // Upload thumbnail baru ke Google Drive
                const fileNameHash = crypto.createHash('md5').update(`new_thumbnail_${id}`).digest('hex');
                const { data } = await drive.files.create({
                    requestBody: {
                        name: fileNameHash + '.jpg', // Ganti dengan ekstensi file yang sesuai
                        mimeType: 'image/jpeg', // Ganti dengan tipe mime yang sesuai
                        parents: ['1d4_5nkRy_G4x7e4trYgG46VxU1TIBUX4'],
                    },
                    media: {
                        mimeType: 'image/jpeg', // Ganti dengan tipe mime yang sesuai
                        body: bufferToStream(req.files[0].buffer),
                    },
                });

                // Set permissions for the file (make it public)
                thumbnailID = data.id;
                await drive.permissions.create({
                    fileId: thumbnailID,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone',
                    },
                });

                thumbnailURL = `https://drive.google.com/uc?export=view&id=${thumbnailID}`;
            } catch (error) {
                console.error('Error updating thumbnail in Google Drive:', error);
                throw error;
            }
        }

        // Lakukan pembaruan di MongoDB
        const updatedKomik = {
            judul: judul || komik.judul,
            author: author || komik.author,
            deskripsi: deskripsi || komik.deskripsi,
            jenis_komik: jenis_komik || komik.jenis_komik,
            genre: genre ? genre.split(',').map((genreItem) => genreItem.trim()) : komik.genre,
            status: status || komik.status,
            rating: rating || komik.rating,
            thumbnail: thumbnailURL,
            thumbnailID: thumbnailID,
        };

        const result = await db.collection('komik').updateOne({ _id: new ObjectId(id) }, { $set: updatedKomik });

        if (result.modifiedCount === 1) {
            return res.json({ message: 'Komik berhasil diperbarui' });
        } else {
            return res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui komik' });
        }
    } catch (error) {
        console.error('Error saat memperbarui komik:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui komik' });
    }
};

const getKomikByID = async (req, res) => {
    try {
        const { id } = req.params;
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(id) });

        if (!komik) {
            return res.status(404).json({ error: 'Komik tidak ditemukan' });
        }

        // Membuat objek respons tanpa menampilkan ID MongoDB
        const komikResponse = {
            judul: komik.judul,
            author: komik.author,
            deskripsi: komik.deskripsi,
            jenis_komik: komik.jenis_komik,
            genre: komik.genre,
            status: komik.status,
            uploader: komik.uploader,
            rating: komik.rating,
            chapter: komik.chapter,
            thumbnail: komik.thumbnail,
            created_at: komik.created_at,
            // Tambahan informasi lain yang mungkin Anda ingin sertakan
        };

        res.json(komikResponse);
    } catch (error) {
        console.error('Error saat mengambil komik berdasarkan ID:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil komik' });
    }
};

module.exports = { getAllKomik, addKomik, deleteKomik, updateKomik, getKomikByID };
