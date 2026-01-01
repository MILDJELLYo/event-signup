router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid login" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid login" });

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "strict"
  });

  res.json({
    mustChangePassword: user.mustChangePassword
  });
});
