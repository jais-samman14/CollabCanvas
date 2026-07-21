const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { validationResult } = require("express-validator");
const generateOTP = require('../utils/otpGenerator');
const {redisClient} = require("../config/redis");
const {sendPasswordResetOTP} = require('../services/emailService');
const crypto = require("crypto");
const hashOTP = (otp) =>{
    return crypto.createHash("sha256").update(String(otp)).digest("hex");
};


//Register a new user(sign up)
const signupUser = async (req, res) => {
    try{
        const { name, email, password } = req.body;
        //check if user already exists
        const userExists = await User.findOne({ email });
        if(userExists){
            return res.status(400).json({message: "User already exists"});
        }
        //create new user
        const user = await User.create({name, email, password});
        if(user){
            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    token: generateToken(user),//immediately give token so that after signup,user shold not redirected to login page
                }
            });
        }
        else{
            return res.status(400).json({message: "Invalid user data"});
        }
    }
    catch(error){
        return res.status(500).json({message: "Internal server error"});
    }   
};

//login user
const loginUser = async (req, res) => {
    try{
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({
                success : false,
                message : "Email and Password are missing"
            });
        }
        const user = await User.findOne({ email });
        if(user && (await user.matchPassword(password))){
            return res.status(200).json({
                success: true,
                message: "User logged in successfully",
                data: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    token: generateToken(user),//logged in user should get token to access protected routes
                }
            });
        }
        else{
            return res.status(401).json({message: "Invalid email or password"});
        }
    }
    catch(error){
        return res.status(500).json({message: "Internal server error"});
    }   
};

//forgot-password
const forgotPassword = async(req,res)=>{
    try{
        const {email} = req.body;
        if(!email){
            return res.status(400).json({
                success : false,
                message : "Email is required",
            });
        }
        const user = await User.findOne({email});
        const cooldownKey = `password_reset_cooldown:${email}`;
        const cooldownExists = await redisClient.get(cooldownKey);
        if(cooldownExists){
            return res.status(429).json({
                success : false,
                message : "Please wait 30 seconds before requesting another OTP"
            });
        }
        if(!user){
            return res.status(400).json({
                success : false,
                message : "If the email exists, an OTP has been sent.",
            });
        }
        const otp = generateOTP();
        const hashedOtp = hashOTP(otp);
        const otpKey = `password_reset_otp:${email}`;

        await redisClient.set(otpKey, hashedOtp, { EX : 300});
        const verifyStored = await redisClient.get(otpKey);
        const attempsKey = `password_reset_attempts:${email}`;
        await redisClient.del(attempsKey);
        await redisClient.set(cooldownKey, "1", {EX : 30});

        await sendPasswordResetOTP(email, otp);
        return res.status(200).json({
            success : true,
            message : "If the email exists, an OTP has been sent",
        });

    }
    catch(error){
        console.error("Forgot Password Error : ", error);
        return res.status(500).json({
            success : false,
            message : "Failed to process request",
        });
    }
};

//reset-password
const resetPassword = async(req, res)=>{
    try{
        const { email }= req.body;
        const otp = String(req.body.otp || "").trim();
        const newPassword = String(req.body.newPassword || "");
        if(!email || !otp || !newPassword){
            return res.status(400).json({
                success : false,
                message : "Email, OTP and new password are required",
            });
        }
        if(newPassword.length < 6){
            return res.status(400).json({
                success : false,
                message : "Password must be at least 6 characters",
            });
        }

        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({
                success : false,
                message : "Invalid or expired OTP",
            });
        }

        const otpKey = `password_reset_otp:${email}`;
        const attemptKey = `password_reset_attempts:${email}`;
        const cooldownKey = `password_reset_cooldown:${email}`;

        const attempts = Number((await redisClient.get(attemptKey)) || 0);
        if(attempts >= 10){
            return res.status(429).json({
                success : false,
                message : "Too many wrong otp attempts. Please request a new OTP later."
            })
        }

        const storedHashedOtp = await redisClient.get(otpKey);
        if(!storedHashedOtp){
            return res.status(400).json({
                success : false,
                message : "Invalid or expired OTP",
            });
        }

        const incomingHashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
        if(incomingHashedOTP !== storedHashedOtp){
            const newAttempts = await redisClient.incr(attemptKey);
            if(newAttempts == 1){
                await redisClient.expire(attemptKey, 15 * 60);
            }
            const remaining =Math.max(0, 5 - newAttempts);
            return res.status(400).json({
                success : false,
                message : `Invalid OTP. ${remaining} attempts remaining.`,
            });
        }
        user.password = newPassword;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        await redisClient.del(otpKey);
        await redisClient.del(attemptKey);
        await redisClient.del(cooldownKey);

        return res.status(200).json({
            success:true,
            message : "Password reset successfully",
        });
    }
    catch(error){
        console.error("Reset Password Error :" , error);
        return res.status(500).json({
            success : false,
            message : "Failed to reset password",
        });
    }
};

//logout
const logoutUser = async(req, res)=>{
    try{
        const user = await User.findById(req.user._id);
        if(!user){
            return res.status(404).json({
                success : false,
                message : "User Not Found",
            });
        }
        user.tokenVersion += 1;
        await user.save();
        return res.status(200).json({
            success : true,
            message : "Logged Out Successfully",
        })
    }
    catch(error){
        console.error("Logout Error", error);
        return res.status(500).json({
            success : false,
            message : "Failed to Logout",
        });
    }
};

module.exports = { signupUser, loginUser, forgotPassword , resetPassword, logoutUser};