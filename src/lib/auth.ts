import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { logEvent } from "@/utils/sentry";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const cookieName = 'auth-token';

export async function signAuthToken(payload: any) {
    try {
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(secret);

        return token;
    } catch (error) {
        logEvent('Error signing auth token', 'auth', { error }, 'error');
        throw new Error('Failed to sign auth token');
    }
}

export async function verifyAuthToken<T>(token: string): Promise<T> {
    try {
        const { payload } = await jwtVerify(token, secret);

        return payload as T;
    } catch (error) {
        logEvent(
            'Token verification failed',
            'auth',
            { tokenSnippet: token.slice(0, 10) + '...' },
            'error',
            error
        );

        throw new Error('Invalid or expired token');
    }
}

export async function setAuthCookie(token: string) {
    try {
        const cookieStore = await cookies();
        cookieStore.set(cookieName, token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600,
            path: '/',
        });
    } catch (error) {
        logEvent('Error setting auth cookie', 'auth', { error }, 'error');
    }
}

export async function getAuthCookie() {
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName)
    return token?.value;
}

export async function removeAuthCookie() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(cookieName);
    } catch (error) {
        logEvent('Error removing auth cookie', 'auth', { error }, 'error');
    }
}