import fs from 'fs';
import path from 'path';

const OTP_FILE_PATH = '/home/vineeth/bp/otp.txt';

// Simple in-memory OTP storage (for demo - use Redis in production)
const otpStore: Record<string, { code: string; expiresAt: number; email: string }> = {};

export function generateOTP(): string {
  // Generate a random 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(email: string, otp: string): void {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore[email] = { code: otp, expiresAt, email };
  console.log(`\n\n=========================================\n=== GENERATED OTP FOR ${email} ===\n=== OTP CODE: ${otp} ===\n=========================================\n\n`);
  
  // Write to otp.txt
  try {
    fs.writeFileSync(OTP_FILE_PATH, `OTP CODE for ${email}: ${otp}\n(Note: This file will clear automatically in 2 minutes)\n`);
    
    // Clear after 2 minutes
    setTimeout(() => {
      try {
        if (fs.existsSync(OTP_FILE_PATH)) {
          const content = fs.readFileSync(OTP_FILE_PATH, 'utf8');
          if (content.includes(otp)) {
             fs.writeFileSync(OTP_FILE_PATH, 'No active OTP. Please request a new one.\n');
          }
        }
      } catch (err) {
        console.error('Error clearing otp.txt:', err);
      }
    }, 2 * 60 * 1000);
  } catch (err) {
    console.error('Error writing to otp.txt:', err);
  }
}

export function verifyOTP(email: string, otp: string): boolean {
  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return false;
  }

  if (Date.now() > storedOtp.expiresAt) {
    delete otpStore[email];
    return false;
  }

  if (storedOtp.code === otp) {
    // Note: We don't delete the OTP here anymore to allow retries if the 
    // registration process fails downstream (e.g. database connection issues).
    // It should be cleared explicitly after successful registration.
    // delete otpStore[email]; 
    return true;
  }

  return false;
}

export function getOTPExpiry(email: string): number | null {
  const storedOtp = otpStore[email];
  if (!storedOtp) return null;
  return Math.ceil((storedOtp.expiresAt - Date.now()) / 1000);
}

export function clearOTP(email: string): void {
  delete otpStore[email];
}
