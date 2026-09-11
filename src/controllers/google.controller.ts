import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import crypto from "crypto";
import hashPassword from '../utils/passwordHash.js';
import { createAccessToken, createRefreshToken } from '../utils/createToken.js';
import { resolve } from 'dns';


dotenv.config();

const getGoogleClient = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID as string;

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET as string;

    const redirectUri = process.env.GOOGLE_REDIRECT_URI as string;

    if(!clientId || !clientSecret || !redirectUri){
        throw new Error('Google env variables missing')
    }

    return new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri
    })
}


export const startGoogleAuthHandler = async (req: Request, res: Response) => {
    try {
       const client = getGoogleClient();

       const url = client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["openid", "email", "profile"]
       });

       res.redirect(url);
       
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

export const googleCallbackHandler = async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;

        if(!code){
            return res.status(400).json({
                message: "Missing code in callback"
            });
        }

        const client = getGoogleClient();

        const {tokens} = await client.getToken(code);

        if(!tokens.id_token){
            return res.status(400).json({
                message: "Missing id_token"
            });
        }

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID as string
        });

        const payload = ticket.getPayload();

        const email = payload?.email;

        const name = payload?.name;

        const emailVerified = payload?.email_verified;

        if(!email || !emailVerified){
            return res.status(400).json({
                message: "Google email account is not verified"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        let user = await User.findOne({email: normalizedEmail});

        if(!user){
            const password = crypto.randomBytes(16).toString('hex');

            const passwordHash = await hashPassword(password);

            user = await User.create({
                email: normalizedEmail,
                name,
                passwordHash,
                role: 'user',
                isEmailVerified: true,
                isTwoFactorEnabled: false,
                isLoggedIn: true
            })
        } else {
            if(!user.isEmailVerified){
                user.isEmailVerified = true;

                await user.save();
            }
        }

        const refreshToken = createRefreshToken(user.id, user.tokenVersion);

        const isProd = process.env.NODE_ENV === 'production';

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const accessToken = createAccessToken(user.id, user.role as 'user' | 'admin', user.tokenVersion);

        return res.status(200).json({
            message: "Login succesfull",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                isTwoFactorEnabled: user.isTwoFactorEnabled
            },
            accessToken
        })

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}


