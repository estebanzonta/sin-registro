import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { readRequiredEnv } from '../config/required-env.js';
import type { AuthRequest, AuthResponse, JWTPayload } from '../types/index.js';

class AuthService {
  private jwtSecret = readRequiredEnv('JWT_SECRET');

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async register(data: AuthRequest): Promise<AuthResponse> {
    const { email, password } = data;

    if (!this.validateEmail(email)) {
      throw new Error('Ingresá un email válido');
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Ya existe una cuenta con ese email');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'customer',
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as 'customer' | 'admin',
        createdAt: user.createdAt,
      },
    };
  }

  async login(data: AuthRequest): Promise<AuthResponse> {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Email o contraseña incorrectos');
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Email o contraseña incorrectos');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as 'customer' | 'admin',
        createdAt: user.createdAt,
      },
    };
  }

  generateToken(userId: string, email: string, role: string): string {
    const payload: JWTPayload = {
      id: userId,
      email,
      role,
    };

    const options: any = {
      expiresIn: process.env.JWT_EXPIRY || '7d',
    };

    return jwt.sign(payload, this.jwtSecret, options);
  }

  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch {
      throw new Error('Tu sesión venció. Ingresá nuevamente.');
    }
  }
}

export const authService = new AuthService();
