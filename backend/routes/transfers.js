const router = require('express').Router();
const ctrl = require('../controllers/transferController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.create);

module.exports = router;
