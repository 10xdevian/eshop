import crypto from "crypto";
import { ValidationError } from "../../../../packages/error-handlers";
import redis from "../../../../packages/libs/redis";
import { NextFunction } from "express";
import { sendEmail } from "./sendMail";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
  data: any,
  userType: "user" | "seller"
) => {
  // Implement validation logic based on userType
  const { name, email, password, phone_number, country } = data;

  if (
    !name ||
    !email ||
    !password ||
    (userType === "seller" && (!phone_number || !country))
  ) {
    throw new ValidationError(`Missing required fields!`);
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format!`);
  }
};

export const checkOtpRestrictions = async (email: string, next: NextFunction) => {
  if (await redis.get(`otp_lock:${email}`)) {
    return next(
        new ValidationError(
            "Account locked due to multiple failed attempts! Try again 30 minutes later."
        )
    )
  }
  if(await redis.get(`otp_spam_lock:${email}`)) {
    return next(
        new ValidationError(
            "Too many OTP requests! Please try again after some time."
        )
    );
  }

  if(await redis.get(`otp_cooldown:${email}`)) {
    return next(
        new ValidationError(
            "OTP request cooldown active! Please wait before requesting another OTP."
        )
    );
  }
};
export const trackOtpRequests = async (email: string, next: NextFunction) => {
    const otpRequestsKey = `otp_requests_count:${email}`;
    let otpRequests = parseInt((await redis.get(otpRequestsKey)) || "0");
    if(otpRequests >= 2){
        await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 30 * 60); // 30 minutes lock
        return next(
            new ValidationError(
                "Too many OTP requests! Please try again after some time."
            )
        );
    }
    await redis.set(otpRequestsKey, otpRequests + 1, "EX", 10 * 60); // count resets after 10 minutes
}
export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  const otp = crypto.randomInt(1000, 9999).toString();
  //send otp email logic here
  console.log(
    `Sending OTP ${otp} to email ${email} using template ${template}`
  );
  await sendEmail(email, "Verify Your Email", template, { name, otp });
  await redis.set(`otp:${email}`, otp, "EX", 5 * 60); // OTP valid for 5 minutes
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60); // Cooldown of 1 minute
};
