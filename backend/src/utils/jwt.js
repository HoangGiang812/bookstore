  import jwt from 'jsonwebtoken';

  export const signAccess = (userId) => {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: Number(process.env.JWT_ACCESS_EXPIRES) || 900 });
  };
  export const signRefresh = (userId, jti) => {
    return jwt.sign({ sub: userId, jti }, process.env.JWT_REFRESH_SECRET, { expiresIn: Number(process.env.JWT_REFRESH_EXPIRES) || 1209600 });
  };
