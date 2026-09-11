import { Router } from "express";
import { forgotPassword, handleVerifyEmail, loginUser, logout, refreshTokenHandler, registerUser, resetPassword } from "../controllers/user.controller.js";
import { userAuth } from "../middleware/auth.middleware.js";
import { adminAuth } from "../middleware/admin.middleware.js";
import { googleCallbackHandler, startGoogleAuthHandler } from "../controllers/google.controller.js";

const router = Router();

//Register users 
router.post('/register', registerUser);

//Login users
router.post('/login', loginUser);

//Login admin
router.post('/login/admin', loginUser);

//Verify users email
router.get('/verify-email', handleVerifyEmail);

//Refresh tokens
router.post('/refresh', refreshTokenHandler);

//Logout users
router.post('/logout', logout);

//Forgot password
router.post('/forgot-password', forgotPassword);

//Reset password 
router.post('/reset-password', resetPassword);

//Google OAuth 
router.get('/google', startGoogleAuthHandler);

//Google OAuth callback handler
router.get('/google/callback', googleCallbackHandler)

export default router;