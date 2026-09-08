import { Router } from "express";
import { forgotPassword, handleVerifyEmail, loginUser, logout, refreshTokenHandler, registerUser, resetPassword } from "../controllers/user.controller.js";
import { userAuth } from "../middleware/auth.middleware.js";
import { adminAuth } from "../middleware/admin.middleware.js";

const router = Router();

//Register users 
router.post('/register', registerUser);

//Login users
router.post('/login', userAuth, loginUser);

//Login admin
router.post('/login/admin', userAuth, adminAuth, loginUser);

//Verify users email
router.get('/verify-email', handleVerifyEmail);

//Refresh tokens
router.post('/refresh', refreshTokenHandler);

//Logout users
router.post('/logout', logout);

//Forgot password
router.post('/forgot-password', forgotPassword);

//Reset password 
router.post('/reset-password', resetPassword)

export default router;