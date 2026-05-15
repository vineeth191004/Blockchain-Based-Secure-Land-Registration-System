import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/models/User';
import bcryptjs from 'bcryptjs';
import { generateOTP, storeOTP, verifyOTP, clearOTP } from '@/lib/utils/otp';
import { sendOTPEmail } from '@/lib/utils/email';

export async function POST(request: NextRequest) {
  try {
    const { action, firstName, middleName, lastName, dateOfBirth, gender, phone, email, aadhar, address, username, password, otp } = await request.json();

    // Action 1: Send OTP
    if (action === 'sendOTP') {
      const errors: Record<string, string> = {};

      if (!email?.trim()) errors.email = 'Email is required';
      if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        errors.email = 'Invalid email format';
      }

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }

      const generatedOTP = generateOTP();
      storeOTP(email, generatedOTP);

      // Send email with OTP using Nodemailer
      const emailResult = await sendOTPEmail(email, generatedOTP, firstName || 'User');

      return NextResponse.json(
        { 
          message: 'OTP sent to your email',
          otp: process.env.NODE_ENV === 'development' ? generatedOTP : undefined, // Only show in dev
          emailSent: emailResult.success 
        },
        { status: 200 }
      );
    }

    // Action 2: Verify OTP and Register
    if (action === 'verifyAndRegister') {
      const errors: Record<string, string> = {};

      // Validate OTP first
      if (!otp?.trim()) {
        errors.otp = 'OTP is required';
      } else if (!verifyOTP(email, otp)) {
        errors.otp = 'Invalid or expired OTP';
      }

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }

      // Validation
      if (!firstName?.trim()) errors.firstName = 'First name is required';
      if (!lastName?.trim()) errors.lastName = 'Last name is required';
      if (!dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      if (!gender) errors.gender = 'Gender is required';
      if (!phone?.trim()) errors.phone = 'Phone number is required';
      if (!/^\d{10}$/.test(phone)) errors.phone = 'Phone must be 10 digits';
      if (!email?.trim()) errors.email = 'Email is required';
      if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        errors.email = 'Invalid email format';
      }
      if (!aadhar?.trim()) errors.aadhar = 'Aadhar number is required';
      if (!/^\d{12}$/.test(aadhar)) errors.aadhar = 'Aadhar must be 12 digits';
      if (!address?.trim()) errors.address = 'Address is required';
      if (!username?.trim()) errors.username = 'Username is required';
      if (!password) errors.password = 'Password is required';
      if (password?.length < 6) errors.password = 'Password must be at least 6 characters';

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ errors }, { status: 400 });
      }

      await connectDB();

      // Check for existing user
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return NextResponse.json(
          { errors: { email: 'Email already registered' } },
          { status: 400 }
        );
      }

      const existingAadhar = await User.findOne({ aadhar });
      if (existingAadhar) {
        return NextResponse.json(
          { errors: { aadhar: 'Aadhar number already registered' } },
          { status: 400 }
        );
      }

      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return NextResponse.json(
          { errors: { username: 'Username already taken' } },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create user
      const user = new User({
        firstName,
        middleName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        phone,
        email,
        aadhar,
        address,
        username,
        password: hashedPassword,
      });

      await user.save();
      clearOTP(email);

      return NextResponse.json(
        { message: 'User registered successfully' },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
