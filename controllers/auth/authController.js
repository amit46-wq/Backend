const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../../models/userModel");
const { asyncHandler } = require("../../utils/asyncHandler");
const sendEmail = require("../../utils/sendEmail");
const nodemailer = require("nodemailer");

const { sendToken } = require("../../utils/sendToken");
const { ApiError } = require("../../utils/ApiError");

const { sendOTP } = require("../../utils/smsService");


// Update userSignup to accept verification method
exports.userSignup = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    verificationMethod = 'email' // Default to email
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res
      .status(201)
      .json({ message: "A user with this email already exists." });
  }

  // Create new user
  const user = new User({
    firstName,
    lastName,
    email,
    password,
    phoneNumber: phone,
    role: "user",
    isVerified: false,
    verificationMethod
  });

  // Handle verification based on method
  if (verificationMethod === 'email') {
    // Email verification logic
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save();
    
    try {
      await sendEmail(email, verificationToken);
      return res.status(200).json({ 
        message: "Verification email sent!",
        verificationMethod: 'email'
      });
    } catch (err) {
      console.error("Email send failed:", err.message);
      return res.status(201).json({
        message: "Failed to send verification email. Please try again.",
      });
    }
  } else {
    // SMS verification logic
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save();
    
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const smsSent = await sendOTP(formattedPhone, otp);
      if (smsSent) {
        return res.status(200).json({ 
          message: "OTP sent to your phone!",
          verificationMethod: 'sms'
        });
      } else {
        return res.status(201).json({
          message: "Failed to send OTP. Please try again.",
        });
      }
    } catch (err) {
      console.error("SMS send failed:", err.message);
      return res.status(201).json({
        message: "Failed to send OTP. Please try again.",
      });
    }
  }
});

// Add new OTP verification endpoint
exports.verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ 
    email,
    otp,
    otpExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(201).json({ 
      message: "Invalid or expired OTP." 
    });
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.status(200).json({ 
    message: "Phone number verified successfully!",
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }
  });
});
// User Signin
exports.userSignin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  console.log("LOGIN ATTEMPT FOR EMAIL:", email);

  // Lowercase email to prevent mismatch
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  console.log("FOUND USER:", user);

  if (!user) {
    return res.status(201).json({
      message: "No user found with this email. Please sign up.",
    });
    // return next(new ApiError(400, "User not found."));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(201).json({
      message: "Invalid credentials. Please try again.",
    });
    // return next(new ApiError(401, "Invalid credentials."));
  }

  if (!user.isVerified) {
    return res.status(201).json({
      message:
        "Please verify your account first with link shared in your email.",
    });
    // return next(new ApiError(403, "Please verify your account first."));
  }

  sendToken(user, 200, res);
});

// User Signout
exports.userSignout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Successfully signed out." });
});
