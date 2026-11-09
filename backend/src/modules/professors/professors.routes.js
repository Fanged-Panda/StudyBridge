import { Router } from 'express';
import * as controller from './professors.controller.js';

const router = Router();

router.get('/', controller.list);
router.get('/fields', controller.fields);
router.get('/university/:universityId', controller.byUniversity);

export default router;
