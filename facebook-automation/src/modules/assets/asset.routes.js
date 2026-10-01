const express = require('express');
const assetController = require('./asset.controller');
const validate = require('../../middleware/validation');
const { registerAssetSchema, updateAssetSchema, listAssetQuerySchema } = require('./asset.validation');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/', validate(listAssetQuerySchema, 'query'), assetController.list);
router.post('/sync', authenticate, (req, res, next) => assetController.syncR2(req, res, next));
router.get('/:id', assetController.getById);
router.post('/', authenticate, validate(registerAssetSchema, 'body'), assetController.register);
router.patch('/:id', authenticate, validate(updateAssetSchema, 'body'), assetController.update);
router.delete('/:id', authenticate, assetController.remove);
router.post('/:id/analyze', authenticate, assetController.analyze);

module.exports = router;
