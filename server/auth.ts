import crypto from 'node:crypto';
import { storage } from './storage.js';
import { AuthUser, UserAccount, UserRole } from '../src/types.js';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = hashPassword(password, salt);
  return check.hash === hash;
}

interface SessionData {
  user: AuthUser;
  expiresAt: number;
}

class AuthService {
  private sessions: Map<string, SessionData> = new Map();

  constructor() {
    this.ensureDefaultUsers();
  }

  public ensureDefaultUsers(): void {
    const existingUsers = storage.getUsers();
    const kasirUser = existingUsers?.find((u) => u.username.toLowerCase() === 'kasir');

    if (!kasirUser) {
      const creds = hashPassword('kasir123');
      const soleAdmin: UserAccount = {
        id: 'usr-kasir-1',
        username: 'kasir',
        name: 'Administrator Kasir',
        role: 'admin',
        passwordHash: creds.hash,
        salt: creds.salt,
        createdAt: new Date().toISOString(),
      };
      storage.setUsers([soleAdmin]);
    } else {
      // Ensure kasir user has admin role and keep it as the single user account
      const updatedKasir: UserAccount = {
        ...kasirUser,
        role: 'admin',
        name: kasirUser.name || 'Administrator Kasir',
      };
      storage.setUsers([updatedKasir]);
    }
  }

  public login(username: string, password: string): { success: boolean; user?: AuthUser; token?: string; error?: string } {
    this.ensureDefaultUsers();

    const cleanUsername = username.trim().toLowerCase();
    const user = storage.getUserByUsername(cleanUsername);

    if (!user) {
      return { success: false, error: 'Username atau password salah' };
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return { success: false, error: 'Username atau password salah' };
    }

    // Update last login
    const updatedUser = storage.updateUser(user.id, { lastLogin: new Date().toISOString() }) || user;

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const authUser: AuthUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
    };

    // Valid for 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    this.sessions.set(token, { user: authUser, expiresAt });

    return { success: true, user: authUser, token };
  }

  public authenticateToken(token: string): AuthUser | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session.user;
  }

  public logout(token: string): void {
    if (token) {
      this.sessions.delete(token);
    }
  }

  public changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Password baru minimal 4 karakter' };
    }

    const user = storage.getUserById(userId);
    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan' };
    }

    const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
    if (!isValid) {
      return { success: false, error: 'Password saat ini tidak sesuai' };
    }

    const newCreds = hashPassword(newPassword);
    storage.updateUser(userId, {
      passwordHash: newCreds.hash,
      salt: newCreds.salt,
    });

    return { success: true };
  }

  public listUsers(): AuthUser[] {
    this.ensureDefaultUsers();
    return storage.getUsers().map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }));
  }

  public createUser(
    requestorId: string,
    payload: { username: string; name: string; password: string; role: UserRole }
  ): { success: boolean; user?: AuthUser; error?: string } {
    const requestor = storage.getUserById(requestorId);
    if (!requestor || requestor.role !== 'admin') {
      return { success: false, error: 'Hanya Admin yang dapat mendaftarkan akun baru' };
    }

    const cleanUsername = payload.username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter' };
    }

    if (!payload.password || payload.password.length < 4) {
      return { success: false, error: 'Password minimal 4 karakter' };
    }

    const existing = storage.getUserByUsername(cleanUsername);
    if (existing) {
      return { success: false, error: 'Username sudah digunakan' };
    }

    const creds = hashPassword(payload.password);
    const newUser: UserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      username: cleanUsername,
      name: payload.name.trim() || cleanUsername,
      role: payload.role || 'cashier',
      passwordHash: creds.hash,
      salt: creds.salt,
      createdAt: new Date().toISOString(),
    };

    storage.saveUser(newUser);

    return {
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    };
  }
}

export const authService = new AuthService();
