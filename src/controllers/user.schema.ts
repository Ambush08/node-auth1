import {email, z} from 'zod';

export const registerSchema = z.object({
    email: z.email(),
    password: z.string().min(8).trim(),
    name: z.string().min(3)
});


export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(8).trim()
});