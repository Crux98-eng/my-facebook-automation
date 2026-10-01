const express = require('express');
const postController = require('./post.controller');
const validate = require('../../middleware/validation');
const { createPostSchema, schedulePostSchema, listPostQuerySchema } = require('./post.validation');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/', validate(listPostQuerySchema, 'query'), postController.list);
router.get('/:id', postController.getById);
router.post('/', authenticate, validate(createPostSchema, 'body'), postController.create);
router.post('/publish', authenticate, postController.publish);
router.post('/:id/publish', authenticate, postController.publish);
router.post('/:id/schedule', authenticate, validate(schedulePostSchema, 'body'), postController.schedule);
router.post('/:id/cancel', authenticate, postController.cancel);

module.exports = router;
