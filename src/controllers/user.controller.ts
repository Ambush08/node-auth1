import { User } from "../models/user.model.js";
import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./user.schema.js";
import hashPassword from "../utils/passwordHash.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/mail.js";
import bcrypt from "bcryptjs";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshTokens,
} from "../utils/createToken.js";
import crypto from "crypto";

dotenv.config();

const getAppUrl = () => {
  return process.env.APP_URL || `http://localhost:${process.env.PORT}`;
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid data",
        error: result.error.flatten(),
      });
    }

    const { email, password, name } = result.data;

    const normalizedEmail = email.toLowerCase().trim();

    //Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message:
          "User with email already exists. Please use a different email.",
      });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      name,
      isEmailVerified: false,
      isTwoFactorEnabled: false,
    });

    //Verify email
    const verifyToken = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "30min" },
    );

    const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${verifyToken}`;

    await sendEmail(
      newUser.email,
      "Verify your email",
      `
            <p>Click this link to verify email</p>
            <P>
                <a href=${verifyUrl} target='_blank'>${verifyUrl}</a>
            </p>
            `,
    );

    return res.status(201).json({
      message:
        "User created successfully. Please check your email to verify your account.",
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server eror.",
    });
  }
};

export const handleVerifyEmail = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({
        message: "Inavlid or missing token",
      });
    }

    const secret = process.env.JWT_SECRET as string;

    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        message: "Email is already verified. Proceed to login",
      });
    }

    user.isEmailVerified = true;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully. Proceed to login",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "Inavlid or expired verification link",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid data",
        error: result.error.flatten(),
      });
    }

    const { email, password } = result.data;

    const normalizedEmail = email.toLowerCase().trim();

    //Find the user by email
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordHash",
    );

    //If no user is found
    if (!user) {
      return res.status(404).json({
        message: `User with ${normalizedEmail} does not exist. Please register`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    //Check if there is no password match
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email",
      });
    }

    const accessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    );

    const refreshToken = createRefreshToken(user.id, user.tokenVersion);

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    user.isLoggedIn = true;
    await user.save()

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
      accessToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;

    if (!token) {
      return res.status(400).json({
        message: "Missing token",
      });
    }

    const decoded = verifyRefreshTokens(token) as {
      userId: string;
      tokenVersion: number;
    };

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        message: "invalid or missing refresh token",
      });
    }

    const newAccessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    );

    const newRefreshToken = createRefreshToken(user.id, user.tokenVersion);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "New access token created",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      message: "Invalid or expired refresh token. Please log in again.",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("refreshToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "Logged out",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "internal server error",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const {email} = req.body as {email: string};

    if(!email){
        return res.status(400).json({
            message: "Email is required"
        });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({email: normalizedEmail});

    if(!user){
        return res.json({
            message: "If an account with this email exists, a reset password link has been sent to your email. Click the link to reset your password."
        });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const resetPasswordUrl = `${getAppUrl()}/auth/reset-password?token=${rawToken}`;

    await sendEmail(
        user.email,
        'Password reset',
        `
        <p>Click the link below to reset your password.</p>
        <p>
            <a href='${resetPasswordUrl}' target='_blank'>${resetPasswordUrl}</a>
        </p>
        `
    );

    return res.json({
        message: "If an account with this email exists, a reset password link has been sent to your email. Click the link to reset your password."
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({
        message: 'Internal server error'
    });
  }
};


export const resetPassword = async (req: Request, res: Response) => {
    try {
        const{ token, password } = req.body as {token: string, password: string};

        if(!token){
            return res.status(400).json({
                message: "Invalid or missing token"
            });
        }

        if(!password || password.length < 8){
            return res.status(400).json({
                message: "Password must be 8 characters"
            });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpires: { $gt: Date.now() }
        }).select("+passwordHash");

        if(!user){
            return res.status(400).json({
                message: "Invalid or expired token"
            });
        }

        const newPassword = await hashPassword(password);
        user.passwordHash = newPassword;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.tokenVersion = user.tokenVersion + 1;

        await user.save();

        return res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}