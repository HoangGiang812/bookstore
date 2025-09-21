import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController.js";

const r = Router();

// Auth cơ bản
r.post("/register", register);
r.post("/login", login);
r.post("/refresh", refresh);
r.post("/logout", requireAuth, logout);

// Quên/đặt lại mật khẩu
r.post("/request-reset", requestPasswordReset);
r.post("/reset", resetPassword);

export default r;
