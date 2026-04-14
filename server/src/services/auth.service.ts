import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { AuthRequest, AuthResponse, JWTPayload } from '../types/index.js';

class AuthService {
  private jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';

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

    // Validate email
    if (!this.validateEmail(email)) {
      throw new Error('Ingresá un email válido');
    }

    // Validate password
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Ya existe una cuenta con ese email');
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'customer',
      },
    });

    // Generate JWT
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Email o contraseña incorrectos');
    }

    // Compare passwords
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Email o contraseña incorrectos');
    }

    // Generate JWT
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
    } catch (err) {
      throw new Error('Tu sesión venció. Ingresá nuevamente.');
    }
  }
}

export const authService = new AuthService();
