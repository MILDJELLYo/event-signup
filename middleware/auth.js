const jwt = require("jsonwebtoken");

module.exports = (roles = []) => {
  return (req, res, next) => {
    try {
      const token = req.cookies.token;
      if (!token) return res.sendStatus(401);

      const user = jwt.verify(token, process.env.JWT_SECRET);

      if (roles.length && !roles.includes(user.role)) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    } catch {
      res.sendStatus(401);
    }
  };
};
