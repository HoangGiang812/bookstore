import { Router } from "express";
import {
  listCategories,
  listCategoriesTree,   // <--- thêm
  getCategory,
  createCategory,
  updateCategory,
  removeCategory,
  reorderCategories,
} from "../controllers/categoryController.js";
// import { auth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

// Public
router.get("/", listCategories);
router.get("/tree", listCategoriesTree); // <--- endpoint cho FE
router.get("/:idOrSlug", getCategory);

// Admin (tuỳ ý bật middleware)
router.post("/", /*auth, requireAdmin,*/ createCategory);
router.put("/:idOrSlug", /*auth, requireAdmin,*/ updateCategory);
router.delete("/:idOrSlug", /*auth, requireAdmin,*/ removeCategory);
router.post("/reorder", /*auth, requireAdmin,*/ reorderCategories);

export default router;
