const { ObjectId } = require('bson')
const db = require('../config/mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/thumbnail')); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
    }
});

const upload = multer({ storage: storage });

const getAllKomik = (req, res) => {
    db.collection('komik').find().toArray()
        .then(result => res.send(result))
        .catch(error => res.status(500).send(error));
};

const addKomik = (req, res) => {
    upload.single('thumbnail')(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(500).send(err);
      } else if (err) {
        return res.status(500).send(err);
      }
  
      const { judul, author, deskripsi, jenis_komik, genre, status, uploader, chapter, rating } = req.body;
  
      if (!judul || !author || !deskripsi || !jenis_komik || !status || !uploader) {
        return res.status(400).send("Data tidak lengkap");
      }
  
      // Ubah genre menjadi array
      const genreArray = genre.split(',').map(g => g.trim());
  
      const newComic = {
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
        thumbnail: req.file.filename
      };
  
      db.collection('komik').insertOne(newComic)
        .then(result => res.send(result))
        .catch(error => res.status(500).send(error));
    });
  };


const getKomikById = (req, res) => {
    const komikId = req.params.id;

    if (!komikId) {
        return res.status(400).send("ID komik tidak valid");
    }

    db.collection('komik').findOne({ _id: new ObjectId(komikId) })
        .then(result => {
            if (!result) {
                return res.status(404).send("Komik tidak ditemukan");
            }
            res.send(result);
        })
        .catch(error => res.status(500).send(error));
};


const deleteKomik = (req, res) => {
    const komikId = req.params.id;

    if (!komikId) {
        return res.status(400).send("ID komik tidak valid");
    }

    db.collection('komik').findOne({ _id: new ObjectId(komikId) })
        .then(async (result) => {
            if (!result) {
                return res.status(404).send("Komik tidak ditemukan");
            }

            const thumbnailFileName = result.thumbnail;

            if (!thumbnailFileName) {
                return res.status(500).send("File thumbnail tidak ditemukan dalam data komik");
            }

            const thumbnailPath = path.join(__dirname, '../public/thumbnail/', thumbnailFileName);

            // Hapus file thumbnail
            fs.unlink(thumbnailPath, (err) => {
                if (err) {
                    console.error("Error deleting thumbnail file:", err);
                    return res.status(500).send("Gagal menghapus file thumbnail");
                }

                console.log("File thumbnail berhasil dihapus:", thumbnailFileName);
            });

            // Hapus file gambar chapter
            const chapters = result.chapter || [];
            chapters.forEach(async (chapter) => {
                if (chapter.daftarGambar && chapter.daftarGambar.length > 0) {
                    chapter.daftarGambar.forEach((gambar) => {
                        const gambarPath = path.join(__dirname, '../public/thumbnail/', gambar.nama);
                        fs.unlink(gambarPath, (gambarErr) => {
                            if (gambarErr) {
                                console.error("Error deleting chapter image file:", gambarErr);
                            }
                            console.log("Chapter image file deleted:", gambar.nama);
                        });
                    });
                }
            });

            // Hapus komik dari database
            const deleteResult = await db.collection('komik').deleteOne({ _id: new ObjectId(komikId) });

            if (deleteResult.deletedCount === 0) {
                return res.status(404).send("Komik tidak ditemukan saat penghapusan");
            }

            res.send("Komik berhasil dihapus");
        })
        .catch(error => {
            console.error("Error deleting komik:", error);
            res.status(500).send("Gagal menghapus komik");
        });
};


const updateKomik = (req, res) => {
    const komikId = req.params.id;

    if (!komikId) {
        return res.status(400).send("ID komik tidak valid");
    }

    upload.single('thumbnail')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).send(err);
        } else if (err) {
            return res.status(500).send(err);
        }

        try {
            const { judul, author, deskripsi, jenis_komik, genre, status, uploader, chapter, rating } = req.body;

            if (!judul || !author || !deskripsi || !jenis_komik || !genre || !status || !uploader) {
                return res.status(400).send("Data tidak lengkap");
            }

            const updatedComic = {
                judul,
                author,
                deskripsi,
                jenis_komik,
                genre,
                status,
                uploader,
                chapter,
                rating,
                updated_at: new Date(),
            };

            if (req.file) {
                updatedComic.thumbnail = req.file.filename;

                // Hapus thumbnail lama jika ada
                const oldKomik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });
                const oldThumbnailFileName = oldKomik.thumbnail;

                if (oldThumbnailFileName) {
                    const oldThumbnailPath = path.join(__dirname, '../public/thumbnail/', oldThumbnailFileName);
                    fs.unlink(oldThumbnailPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error("Error deleting old thumbnail file:", unlinkErr);
                        }
                        console.log("Old thumbnail file deleted:", oldThumbnailFileName);
                    });
                }
            }

            const result = await db.collection('komik').updateOne(
                { _id: new ObjectId(komikId) },
                { $set: updatedComic }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).send("Komik tidak ditemukan saat pembaruan");
            }

            res.send("Komik berhasil diperbarui");
        } catch (error) {
            console.error("Error updating komik:", error);
            res.status(500).send("Gagal memperbarui komik");
        }
    });
};

const addChapter = async (req, res) => {
    const komikId = req.params.id;
  
    if (!komikId) {
      return res.status(400).send("ID komik tidak valid");
    }
  
    try {
      const { judulChapter, nomorChapter, daftarGambar } = req.body;
  
      if (!judulChapter || !nomorChapter) {
        return res.status(400).send("Data chapter tidak lengkap");
      }
  
      const newChapter = {
        _id: new ObjectId(),
        judulChapter,
        nomorChapter,
        daftarGambar,
        created_at: new Date(),
      };
  
      // Periksa apakah bidang 'chapter' sudah ada sebagai array
      const komik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });
      
      if (!komik.chapter || !Array.isArray(komik.chapter)) {
        // Jika bidang 'chapter' belum ada, inisialisasikan sebagai array kosong
        await db.collection('komik').updateOne(
          { _id: new ObjectId(komikId) },
          { $set: { chapter: [] } }
        );
      }
  
      // Tambahkan chapter baru
      const result = await db.collection('komik').updateOne(
        { _id: new ObjectId(komikId) },
        { $push: { chapter: newChapter } }
      );
  
      if (result.modifiedCount > 0) {
        res.send("Chapter berhasil ditambahkan");
      } else {
        return res.status(404).send("Komik tidak ditemukan saat menambah chapter");
      }
    } catch (error) {
      console.error("Error adding chapter:", error);
      res.status(500).send("Gagal menambahkan chapter");
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

const deleteChapter = async (req, res) => {
    const komikId = req.params.id;
    const chapterId = req.params.chapterId;

    if (!komikId || !chapterId) {
        return res.status(400).send("ID komik atau ID chapter tidak valid");
    }

    try {
        const komik = await db.collection('komik').findOne({ _id: new ObjectId(komikId) });

        if (!komik) {
            return res.status(404).send("Komik tidak ditemukan");
        }

        const chapterIndex = komik.chapter.findIndex(chap => chap._id.toString() === chapterId);

        if (chapterIndex === -1) {
            return res.status(404).send("Chapter tidak ditemukan");
        }

        const thumbnailFileName = komik.chapter[chapterIndex].thumbnail;

        if (thumbnailFileName) {
            const thumbnailPath = path.join(__dirname, '../public/thumbnail/', thumbnailFileName);
            await fs.promises.unlink(thumbnailPath); // Use fs.promises.unlink for promise-based file deletion
            console.log("Chapter thumbnail file deleted:", thumbnailFileName);
        }

        // Hapus file gambar pada setiap chapter
        const chapter = komik.chapter[chapterIndex];
        if (chapter.daftarGambar && chapter.daftarGambar.length > 0) {
            chapter.daftarGambar.forEach(async (gambar) => {
                if (gambar.nama) {
                    const gambarPath = path.join(__dirname, '../public/thumbnail/', gambar.nama);
                    await fs.promises.unlink(gambarPath); // Use fs.promises.unlink for promise-based file deletion
                    console.log("Chapter image file deleted:", gambar.nama);
                }
            });
        }

        komik.chapter.splice(chapterIndex, 1);

        const result = await db.collection('komik').updateOne(
            { _id: new ObjectId(komikId) },
            { $set: { chapter: komik.chapter } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send("Komik tidak ditemukan saat menghapus chapter");
        }

        res.send("Chapter berhasil dihapus");
    } catch (error) {
        console.error("Error deleting chapter:", error);
        res.status(500).send("Gagal menghapus chapter");
    }
};

const addGambar = async (req, res) => {
    const komikId = req.params.id;
    const chapterId = req.params.chapterId;

    if (!komikId || !chapterId) {
        return res.status(400).send("ID komik atau ID chapter tidak valid");
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

        if (!chapter.daftarGambar) {
            chapter.daftarGambar = [];
        }

        upload.single('gambar')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(500).send(err);
            } else if (err) {
                return res.status(500).send(err);
            }

            const namaGambar = req.file.filename;
            const gambarId = new ObjectId(); // Membuat _id baru untuk gambar

            // Memastikan objek gambar memiliki properti _id
            const gambarObj = {
                _id: gambarId,
                nama: namaGambar,
                nomorGambar: chapter.daftarGambar.length + 1
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

        const thumbnailFileName = chapter.daftarGambar[gambarIndex].nama;

        if (thumbnailFileName) {
            const thumbnailPath = path.join(__dirname, '../public/thumbnail/', thumbnailFileName);
            fs.unlink(thumbnailPath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error("Error deleting gambar file:", unlinkErr);
                }
                console.log("Gambar file deleted:", thumbnailFileName);
            });
        }

        chapter.daftarGambar.splice(gambarIndex, 1);

        const result = await db.collection('komik').updateOne(
            { _id: new ObjectId(komikId), 'chapter._id': new ObjectId(chapterId) },
            { $set: { 'chapter.$.daftarGambar': chapter.daftarGambar } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send("Chapter atau gambar tidak ditemukan saat menghapus gambar");
        }

        res.send("Gambar berhasil dihapus");
    } catch (error) {
        console.error("Error deleting gambar:", error);
        res.status(500).send("Gagal menghapus gambar");
    }
};

const updateGambar = async (req, res) => {
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

        const { nomorGambar } = req.body;

        if (!nomorGambar) {
            return res.status(400).send("Data gambar tidak lengkap");
        }

        // Perbarui nomorGambar
        chapter.daftarGambar[gambarIndex].nomorGambar = nomorGambar;

        const result = await db.collection('komik').updateOne(
            { _id: new ObjectId(komikId), 'chapter._id': new ObjectId(chapterId) },
            { $set: { 'chapter.$.daftarGambar': chapter.daftarGambar } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send("Chapter atau gambar tidak ditemukan saat memperbarui gambar");
        }

        res.send("Gambar berhasil diperbarui");
    } catch (error) {
        console.error("Error updating gambar:", error);
        res.status(500).send("Gagal memperbarui gambar");
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

module.exports = { getAllKomik, addKomik, deleteKomik, getKomikById, updateKomik, 
                 addChapter, getChapterById, deleteChapter, addGambar, deleteGambar, 
                 updateGambar, getChapterByNumber};
