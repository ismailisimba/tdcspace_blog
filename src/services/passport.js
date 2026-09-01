import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

// === LOCAL STRATEGY (EMAIL/PASSWORD) ===
passport.use(new LocalStrategy({ usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect email or password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// === GOOGLE OAUTH STRATEGY ===
const googleCallbackUrl = process.env.BASE_URL 
  ? `${process.env.BASE_URL}/auth/google/callback` 
  : "/auth/google/callback";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackUrl
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user);
      } 
      
      const email = profile.emails[0].value;
      let existingUser = await User.findOne({ email });

      if (existingUser) {
        existingUser.googleId = profile.id;
        existingUser.emailVerified = true;
        await existingUser.save();
        return done(null, existingUser);
      } else {
        const newUser = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          emailVerified: true,
        });
        return done(null, newUser);
      }
    } catch (err) {
      return done(err, null);
    }
  }
));

// === SERIALIZE & DESERIALIZE USER ===
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
