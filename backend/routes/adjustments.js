const router = require('express').Router();
const ctrl = require('../controllers/adjustmentController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.create);

module.exports = router;
