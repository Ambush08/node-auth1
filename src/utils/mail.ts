import nodemailer from "nodemailer";
import dotenv from 'dotenv'

dotenv.config();

const port = Number(process.env.SMTP_PORT);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const host = process.env.SMTP_HOST;
const from = process.env.EMAIL_FROM;

export const sendEmail = async(to: string, subject: string, html: string) => {
    try {
        if(!port || !user || !pass || !host){
            console.log("Missing email env variables");
            return;
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 467,
            auth: {
                user,
                pass
            }
        });

        await transporter.sendMail({
            from,
            to, 
            subject,
            html
        })
    } catch (error) {
        console.log(error);
        return;
    }
}