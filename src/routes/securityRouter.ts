import express, { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import { DateTime } from 'luxon';
import { omit, pick } from 'radash';
import { z } from 'zod';
import { ENV } from '../env';
import prisma from '../prisma';
import { AuthMiddleware } from '../utils/authMiddlewares';
import { DefaultLang, Languages, comparePasswords } from '../utils/common';

const securityRouter = express.Router();

securityRouter.post('/login', async (req: Request, res: Response) => {
    const requestSchema = z.object({
        name: z.string(),
        password: z.string()
    });

    const result = requestSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(406).json({ error: result.error });
    }

    const { name, password } = result.data;

    const user = await prisma.user.findUnique({
        where: {
            name
        }
    });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (await comparePasswords(password, user.password)) {
        const payload = pick(user, ['id', 'created_at']);
        const token = sign(payload, ENV.JWT_TOKEN, { expiresIn: '2h' });

        return res.status(200).json({ success: true, data: { token } });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
});

securityRouter.post(
    '/refresh-token',
    AuthMiddleware,
    async (req: Request, res: Response) => {
        const payload: { id: number; createdAt: string } = req.app.get('auth');
        const token = sign(payload, ENV.JWT_TOKEN, { expiresIn: '2h' });

        res.status(200).json({ success: true, data: { token } });
    }
);

securityRouter.get(
    '/me',
    AuthMiddleware,
    async (request: Request, response: Response) => {
        const authData: { id: number; createdAt: string } =
            request.app.get('auth');

        const user = await prisma.user.findUnique({
            where: {
                id: authData.id
            }
        });

        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        return response
            .status(200)
            .json({ success: true, data: omit(user, ['password']) });
    }
);

securityRouter.delete(
    '/me',
    AuthMiddleware,
    async (request: Request, response: Response) => {
        const authData: { id: number; createdAt: string } =
            request.app.get('auth');

        await prisma.user.delete({
            where: {
                id: authData.id
            }
        });

        await prisma.questionResult.deleteMany({
            where: {
                user_id: authData.id
            }
        });

        return response.status(200).json({ success: true });
    }
);

securityRouter.patch(
    '/me',
    AuthMiddleware,
    async (req: Request, res: Response) => {
        const bodySchema = z.object({
            name: z.string().min(3).max(20),
            language: z.enum(Languages).default(DefaultLang)
        });

        const result = bodySchema.safeParse(req.body);
        if (!result.success) {
            return res
                .status(406)
                .send({ success: false, error: result.error });
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: req.app.get('auth').id
            },
            data: {
                name: result.data.name,
                updated_at: DateTime.now().toISO(),
                language: result.data.language
            }
        });

        return res.status(200).json({
            success: true,
            user: omit(updatedUser, ['password'])
        });
    }
);

export default securityRouter;
