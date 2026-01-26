import type { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';
import jwt from 'jsonwebtoken';
import type {UserStats} from "../../models/UserStats.model.js";
import type {GameStats} from "../../models/GameStats.model.js";

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

                const userId = user.id;

				const token = jwt.sign({ sub: userId, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
				res.status(200).json({ status: 'ok', data: { token, userId } });
			} catch (err) {
				next(err);
			}
		},

        getUserStats: async (req: Request, res: Response, next: NextFunction) => {
            try {
                const userId :string = req.body.id;

                if (!await service.findByUuid(userId)) {
                    return res.status(404).json({ status: 'error', message: 'User not found' });
                }

                const gameStats :GameStats[] = await service.getStatsByUserId(userId);
                const userStats :UserStats = {
                    id: userId,
                    gameStats: gameStats
                };
                res.status(200).json({ status: 'ok', data: userStats });
            } catch (err) {
                next(err);
            }
        }
	};
}

