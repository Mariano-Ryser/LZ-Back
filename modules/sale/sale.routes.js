const express = require('express');
const router = express.Router();
const saleController = require('./sale.controller');

router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);
router.post('/', saleController.createSale);
router.put('/:id', saleController.updateSale); // opcional
router.delete('/:id', saleController.deleteSale);

module.exports = router;
