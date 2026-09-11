import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';


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