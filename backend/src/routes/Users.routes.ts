import {Router} from 'express';
import {pool} from '../db/pool.js';
import {createDb} from '../db/kysely.js';
import {UsersRepository} from '../repository/Users.repository.js';
import {UsersService} from '../services/Users.service.js';
import {createUsersController} from '../controllers/Users.controller.js';

const UsersRoutes = Router();
const db = createDb(pool);
const repo = new UsersRepository(db);
const service = new UsersService(repo);
const controller = createUsersController(service);

UsersRoutes.post('/register', controller.register);
UsersRoutes.post('/login', controller.login);

export default UsersRoutes;

