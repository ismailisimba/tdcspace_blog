import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, default: '' },
    content: { type: String, required: true },
    headerImageUrl: { type: String },
    published: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Article = mongoose.model('Article', articleSchema);
export default Article;
