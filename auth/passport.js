const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK || "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      // Replace with your school domain
      const allowedDomain = "@mysbisd.org";
      if (!email || !email.endsWith(allowedDomain)) {
        // deny access for non-school emails
        return done(null, false, { message: "School email required" });
      }

      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email,
          name: profile.displayName
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => User.findById(id).then(u => done(null, u)).catch(done));
};
