import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { prisma } from '../db.js';
import { readRequiredEnv } from '../config/required-env.js';
import type { AuthRequest, AuthResponse, JWTPayload, RegisterRequest } from '../types/index.js';

class AuthService {
  private getJwtSecret() {
    return readRequiredEnv('JWT_SECRET');
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8;
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('La contrasena debe tener al menos 6 caracteres');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { firstName, lastName, city, province, address, email, password, phone } = data;

    if (!this.validateEmail(email)) {
      throw new Error('Ingresa un email valido');
    }

    if (!this.validatePhone(phone)) {
      throw new Error('Ingresa un telefono valido');
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
        firstName,
        lastName,
        city,
        province,
        address,
        email,
        password: hashedPassword,
        phone,
        role: 'customer',
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        province: user.province,
        address: user.address,
        email: user.email,
        phone: user.phone,
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
      throw new Error('Email o contrasena incorrectos');
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Email o contrasena incorrectos');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        city: user.city,
        province: user.province,
        address: user.address,
        email: user.email,
        phone: user.phone,
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

    const options = {
      expiresIn: (process.env.JWT_EXPIRY || '7d') as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, this.getJwtSecret(), options);
  }

  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret()) as JWTPayload;
      return decoded;
    } catch {
      throw new Error('Tu sesion vencio. Ingresa nuevamente.');
    }
  }
}

export const authService = new AuthService();
