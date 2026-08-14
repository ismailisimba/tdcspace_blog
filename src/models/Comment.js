import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  },
  { timestamps: true }
);

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
