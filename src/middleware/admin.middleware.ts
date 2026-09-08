import { Request, Response, NextFunction } from "express";
import jwt  from "jsonwebtoken";
import { User } from "../models/user.model.js";



export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;

        if(!header || !header.startsWith("Bearer ")){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const token = header.split(" ")[1];

        const secret = process.env.JWT_SECRET as string;

        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }

        const decoded = jwt.verify(token, secret) as {userId: string, tokenVersion: number};

        const user = await User.findById(decoded.userId);

        if(!user){
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        if(user.role !== 'admin'){
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if(user.tokenVersion !== decoded.tokenVersion){
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        next();


    } catch (error) {
        console.error(error);
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}