import dns from 'dns';
import express from "express";
import type { Express } from "express";
import connectDB from "./config/database.js";
import dotenv from 'dotenv'
import userRouter from './routes/user.routes.js';
import cookieParser from 'cookie-parser';

dns.setServers(['8.8.8.8', '8.8.4.4'])
const app: Express = express();

dotenv.config();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());

app.use('/auth', userRouter)

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`)
        })
    } catch (error) {
        console.log(error)
    }
}

startServer();