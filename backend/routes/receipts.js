const router = require('express').Router();
const ctrl = require('../controllers/receiptController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.post('/', auth, ctrl.create);
router.post('/:id/validate', auth, ctrl.validate);
router.post('/:id/cancel', auth, ctrl.cancel);

module.exports = router;
