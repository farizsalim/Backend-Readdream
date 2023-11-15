const router = require('express').Router();
const komikController = require('../controller/komikController');
const userController = require('../controller/userController');
const cors = require('cors')

router.use(cors());
// Routes for Komik
router.get('/komik', komikController.getAllKomik);
router.post('/komik', komikController.addKomik);
router.get('/komik/:id', komikController.getKomikById);
router.delete('/komik/:id', komikController.deleteKomik);
router.put('/komik/:id', komikController.updateKomik);
router.post('/komik/:id/chapter', komikController.addChapter);
router.get('/komik/:id/chapter/:chapterId', komikController.getChapterById);
router.delete('/komik/:id/chapter/:chapterId', komikController.deleteChapter);
router.post('/komik/:id/chapter/:chapterId/addGambar', komikController.addGambar)
router.delete('/komik/:id/chapter/:chapterId/gambar/:gambarId', komikController.deleteGambar);
router.put('/komik/:id/chapter/:chapterId/gambar/:gambarId', komikController.updateGambar);
router.get('/komik/:id/chapter/nomor/:nomorChapter', komikController.getChapterByNumber);

// Routes for User
router.get('/users', userController.getAllUser);
router.post('/register', userController.register);
router.post('/login', userController.login);

module.exports = router;
