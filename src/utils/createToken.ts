import jwt from 'jsonwebtoken';


export const createAccessToken = (
    userId: string, 
    role: 'user' | 'admin', 
    tokenVersion: number) => {
        const accessToken = jwt.sign({
            userId,
            role,
            tokenVersion
        },
        process.env.JWT_SECRET as string,
        {expiresIn: '1d'});

    return accessToken;
}


export const createRefreshToken = (userId: string, tokenVersion: number) => {
    const refreshToken = jwt.sign({
        userId,
        tokenVersion
    }, process.env.JWT_REFRESH_SECRET as string, {expiresIn: '7d'});

    return refreshToken;
}


export const verifyRefreshTokens = (token: string) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string);
}