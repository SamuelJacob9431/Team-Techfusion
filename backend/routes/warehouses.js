const router = require('express').Router();
const warehouseController = require('../controllers/warehouseController');
const auth = require('../middleware/auth');

// Warehouses
router.get('/', auth, warehouseController.getAll);
router.post('/', auth, warehouseController.createWarehouse);
router.put('/:id', auth, warehouseController.updateWarehouse);
router.delete('/:id', auth, warehouseController.deleteWarehouse);

// Locations
router.post('/locations', auth, warehouseController.createLocation);
router.put('/locations/:id', auth, warehouseController.updateLocation);
router.delete('/locations/:id', auth, warehouseController.deleteLocation);

module.exports = router;
