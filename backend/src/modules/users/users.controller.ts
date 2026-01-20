import type { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';
import jwt from 'jsonwebtoken';

export function createUsersController(service: UsersService) {
	return {
		register: async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { username, email, password } = req.body;
				if (!username || !email || !password) return res.status(400).json({ status: 'error', message: 'Missing fields' });
				const user = await service.register({ username, email, password });
				res.status(201).json({ status: 'ok', data: user });
			} catch (err) {
				next(err);
			}
		},

		login: async (req: Request, res: Response, next: NextFunction) => {
			try {
				const { identifier, password } = req.body;
				if (!identifier || !password) return res.status(400).json({ status: 'error', message: 'Missing fields' });
				const user = await service.authenticate(identifier, password);
				if (!user) return res.status(401).json({ status: 'error', message: 'Invalid credentials' });

				const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
				res.status(200).json({ status: 'ok', data: { token } });
			} catch (err) {
				next(err);
			}
		}
	};
}

