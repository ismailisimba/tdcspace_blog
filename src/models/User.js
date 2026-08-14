import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN'], default: 'USER' },
    emailVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    verificationToken: { type: String, unique: true, sparse: true },
    verificationTokenExpires: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
