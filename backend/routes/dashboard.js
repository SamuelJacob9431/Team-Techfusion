const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getData);

module.exports = router;
