import { Router } from 'express';
import { pool } from '../db/pool.js';
import { createDb } from '../db/kysely.js';
import { UsersRepository } from '../modules/users/users.repository.js';
import { UsersService } from '../modules/users/users.service.js';
import { createUsersController } from '../modules/users/users.controller.js';

const router = Router();
const db = createDb(pool);
const repo = new UsersRepository(db);
const service = new UsersService(repo);
const controller = createUsersController(service);

router.post('/register', controller.register);
router.post('/login', controller.login);

export default router;

