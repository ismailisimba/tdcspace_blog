import bcrypt from 'bcrypt';
import passport from 'passport';
import User from '../models/User.js';
import crypto from 'crypto';
import { generateUniqueName } from '../utils/nameUtils.js';
import { sendVerificationEmail } from '../services/emailService.js';

const SALT_ROUNDS = 10;

export const renderRegister = (req, res) => {
  res.render('pages/register', { user: req.user });
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const uniqueName = await generateUniqueName(name);
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: uniqueName,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires,
      emailVerified: false
    });

    await sendVerificationEmail(email, verificationToken);
    res.redirect('/check-email');
  } catch (error) {
    console.error(error);
    res.redirect('/register');
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect('/login?error=Invalid token');
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user || user.verificationTokenExpires < new Date()) {
      return res.redirect('/login?error=Token expired or invalid');
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  } catch (error) {
    console.error(error);
    res.redirect('/login?error=Verification failed');
  }
};

export const renderLogin = (req, res) => {
  res.render('pages/login', { user: req.user });
};

export const loginUser = passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
});

export const logoutUser = (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
};
