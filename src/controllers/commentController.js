import Comment from '../models/Comment.js';
import Article from '../models/Article.js';

export const createComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    const article = await Article.findOne({ slug }).select('_id');

    if (!article) {
      return res.status(404).send('Article not found.');
    }

    await Comment.create({
      text,
      authorId: userId,
      articleId: article._id,
    });

    res.redirect(`/articles/${slug}`);
  } catch (error) {
    console.error('Error posting comment:', error);
    res.redirect(`/articles/${slug}`);
  }
};
