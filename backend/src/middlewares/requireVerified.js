export const requireVerified = (req, res, next) => {
  if (!req.user?.emailVerified) {
    return res.status(403).json({ message: 'Vui lòng xác thực email trước' });
  }
  next();
};
