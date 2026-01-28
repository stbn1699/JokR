import type {Request, Response} from 'express';
import {UsersService} from '../services/Users.service.js';
import jwt from 'jsonwebtoken';
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";

export function createUsersController(service: UsersService) {
    return {
        register: asyncHandler(async (req: Request, res: Response) => {
            const {username, email, password} = req.body;
            if (!username || !email || !password) return res.status(400).json({
                status: 'error',
                message: 'Missing fields'
            });
            const user = await service.register({username, email, password});
            res.status(201).json({status: 'ok', data: user});
        }),

        login: asyncHandler(async (req: Request, res: Response) => {
            const {identifier, password} = req.body;
            if (!identifier || !password) return res.status(400).json({status: 'error', message: 'Missing fields'});
            const user = await service.authenticate(identifier, password);
            if (!user) return res.status(401).json({status: 'error', message: 'Invalid credentials'});

            const userId = user.id;

            const token = jwt.sign({
                sub: userId,
                username: user.username
            }, process.env.JWT_SECRET || 'dev-secret', {expiresIn: '7d'});
            res.status(200).json({status: 'ok', data: {token, userId}});
        })
    };
}

