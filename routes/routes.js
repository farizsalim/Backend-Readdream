const router = require('express').Router();
const komikController = require('../controller/komikController');
const chapterController = require('../controller/chapterController');
const  userController = require('../controller/userController');

// Routes for Komik
router.get('/komik', komikController.getAllKomik);
router.post('/komik', komikController.addKomik);
router.get('/komik/:id', komikController.getKomikByID);
router.delete('/komik/:id', komikController.deleteKomik);
router.put('/komik/:id', komikController.updateKomik);
router.post('/komik/:id/chapter', chapterController.addChapter);
router.get('/komik/:id/chapter/:chapterId', chapterController.getChapterById);
// router.delete('/komik/:id/chapter/:chapterId', komikController.deleteChapter);
router.post('/komik/:id/chapter/:chapterId/addGambar', chapterController.addGambar)
router.delete('/komik/:id/chapter/:chapterId/gambar/:gambarId', chapterController.deleteGambar);
// router.put('/komik/:id/chapter/:chapterId/gambar/:gambarId', komikController.updateGambar);
router.get('/komik/:id/chapter/nomor/:nomorChapter', chapterController.getChapterByNumber);

// Routes for User
router.get('/users', userController.getAllUser);
router.post('/register', userController.register);
router.post('/login', userController.login);

module.exports = router;
