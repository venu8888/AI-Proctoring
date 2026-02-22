
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'proctor-secret-key-change-me';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    // Simple hardcoded check - in production replace with DB check
    if (username === 'admin' && password === 'admin') {
      const token = jwt.sign(
        { 
          id: 'admin-1', 
          username: 'admin', 
          role: 'admin',
          isAdmin: true 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create response
      const response = NextResponse.json(
        { success: true, user: { username: 'admin', role: 'admin' } },
        { status: 200 }
      );

      // Set httpOnly cookie
      (await cookies()).set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
