'use server';

import { prisma } from "@/db/prisma";
import bcrypt from 'bcryptjs';
import { logEvent } from "@/utils/sentry";
import { signAuthToken, setAuthCookie, removeAuthCookie } from "@/lib/auth";

type ResponseResult = {
    success: boolean;
    message: string;
}

export async function registerUser(prevState: ResponseResult,formData: FormData): Promise<ResponseResult> {
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const name = formData.get('name') as string;

        if(!email || !password || !name) {
            logEvent('Missing required fields', 'auth', {
                email,
                name,
            }, 'warning');

            return {
                success: false,
                message: 'All fields are required'
            }
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if(existingUser) {
            logEvent('User already exists', 'auth', {
                email
            }, 'warning');

            return {
                success: false,
                message: 'User already exists'
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            }
        });

        const token = await signAuthToken({ userId: newUser.id });
        await setAuthCookie(token);

        logEvent('User registered successfully', 'auth', {
            email,
            name
        }, 'info');

        return {
            success: true,
            message: 'User registered successfully'
        }
    } catch (error) {
        logEvent('Error registering user', 'auth', { error }, 'error');
        return {
            success: false,
            message: 'Failed to register user'
        }
    }
}

export async function loginUser(prevState: ResponseResult,formData: FormData): Promise<ResponseResult> {
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if(!email || !password) {
            logEvent('Missing required fields', 'auth', {
                email,
            }, 'warning');

            return {
                success: false,
                message: 'All fields are required'
            }
        }

        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if(!user) {
            logEvent('User not found', 'auth', {
                email
            }, 'warning');

            return {
                success: false,
                message: 'User not found'
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch) {
            logEvent('Invalid password', 'auth', {
                email
            }, 'warning');

            return {
                success: false,
                message: 'Invalid password'
            }
        }

        const token = await signAuthToken({ userId: user.id });
        await setAuthCookie(token);

        logEvent('User logged in successfully', 'auth', {
            email,
            name: user.name
        }, 'info');

        return {
            success: true,
            message: 'User logged in successfully'
        }
    } catch (error) {
        logEvent('Error logging in user', 'auth', { error }, 'error');
        return {
            success: false,
            message: 'Failed to login user'
        }
    }
}

export async function logoutUser(): Promise<ResponseResult> {
    try {
        await removeAuthCookie();

        logEvent('User logged out successfully', 'auth', {}, 'info');

        return {
            success: true,
            message: 'User logged out successfully'
        }
    } catch (error) {
        logEvent('Error logging out user', 'auth', { error }, 'error');
        return {
            success: false,
            message: 'Failed to logout user'
        }
    }
}