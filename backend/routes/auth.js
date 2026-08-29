const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);

router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
