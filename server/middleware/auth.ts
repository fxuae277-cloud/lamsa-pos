import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../logger";

const JWT_SECRET = process.env.SESSION_SECRET || "lamsat-onothah-secret-2024";

export interface JwtPayload {
  userId: number;
  role: string;
  branchId: number | null;
  userName: string;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

function extractPayload(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) {
    return res.status(401).json({ message: "غير مصرح - يجب تسجيل الدخول" });
  }
  req.jwtUser = payload;
  next();
}

export async function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) {
    return res.status(401).json({ message: "غير مصرح - يجب تسجيل الدخول" });
  }
  if (payload.role !== "owner" && payload.role !== "admin") {
    return res.status(403).json({ message: "غير مصرح - صلاحيات غير كافية" });
  }
  req.jwtUser = payload;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = extractPayload(req);
    if (!payload) {
      return res.status(401).json({ message: "غير مصرح - يجب تسجيل الدخول" });
    }
    if (!allowedRoles.includes(payload.role)) {
      return res.status(403).json({ message: "غير مصرح لك. هذه العملية للمدير فقط." });
    }
    req.jwtUser = payload;
    next();
  };
}

export const requireManager = requireRole(["owner", "admin", "manager"]);

export async function enforceBranchScope(req: Request, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) {
    return res.status(401).json({ message: "غير مصرح - يجب تسجيل الدخول" });
  }
  req.jwtUser = payload;
  if (payload.role === "owner" || payload.role === "admin") {
    const qb = (req.query.branchId || req.query.branch_id || req.body?.branchId) as string | undefined;
    if (qb && !isNaN(Number(qb))) {
      req.branchScope = { mode: "branch", branchId: Number(qb) };
    } else {
      req.branchScope = { mode: "company", branchId: null };
    }
  } else {
    req.branchScope = { mode: "branch", branchId: payload.branchId ?? 0 };
  }
  next();
}

export { logger };
