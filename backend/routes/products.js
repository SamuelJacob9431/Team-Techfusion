const router = require('express').Router();
const ctrl = require('../controllers/productController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
