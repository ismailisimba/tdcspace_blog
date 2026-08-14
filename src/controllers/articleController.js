import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import { processAndUploadImage } from '../services/storage.js';
import { truncateText } from '../utils/helpers.js';
import Article from '../models/Article.js';
import User from '../models/User.js';
import UploadedFile from '../models/UploadedFile.js';
import Comment from '../models/Comment.js';

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const generateUniqueSlug = async (title) => {
  let slug = slugify(title, { lower: true, strict: true });
  
  const existing = await Article.findOne({ slug });
  if (existing) {
    slug = `${slug}-${nanoid(5)}`;
  }

  return slug;
};

export const renderCreateForm = (req, res) => {
  res.render('pages/articles/create', { user: req.user });
};

export const createArticle = async (req, res) => {
  try {
    const { title, content, excerpt, action } = req.body;
    let imageUrl = null;

    if (req.file) {
      const { publicUrl, fileName } = await processAndUploadImage(
        req.file.buffer,
        req.file.originalname,
        { resize: { width: 960, height: 540 } }
      );
      imageUrl = publicUrl;
      await UploadedFile.create({
        url: publicUrl, fileName: fileName, userId: req.user.id
      });
    }

    const finalSlug = await generateUniqueSlug(title);

    const newArticle = await Article.create({
      title,
      content,
      excerpt,
      headerImageUrl: imageUrl,
      slug: finalSlug,
      authorId: req.user.id,
      published: action === 'publish',
    });
    res.redirect(`/articles/${newArticle.slug}`);
  } catch (error) {
    console.error('Error creating article:', error);
    res.redirect('/articles/new');
  }
};

export const showArticle = async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({ slug }).populate('authorId').lean();

    if (!article) {
      return res.status(404).send('Article not found');
    }

    const canViewHidden = req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR');
    if (article.hidden && !canViewHidden) {
      return res.status(404).send('Article not found');
    }

    if (article.published) {
      await Article.findByIdAndUpdate(article._id, { $inc: { viewCount: 1 } });
    }

    const comments = await Comment.find({ articleId: article._id }).populate('authorId').sort({ createdAt: 'asc' }).lean();
    article.comments = comments;
    article.author = article.authorId; // alias for EJS templates expecting article.author

    const renderer = new marked.Renderer();
    renderer.link = ({ href, title, text }) => {
      return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${text}</a>`;
    };

    renderer.image = ({ href, title, text }) => {
      let alignClass = 'img-center';
      let src = href;
      if (src.endsWith('#left')) {
          alignClass = 'img-left'; src = src.slice(0, -5);
      } else if (src.endsWith('#right')) {
          alignClass = 'img-right'; src = src.slice(0, -6);
      } else if (src.endsWith('#center')) {
          src = src.slice(0, -7);
      }
      return `<img src="${src}" alt="${text || 'Embedded image'}" class="my-4 rounded-lg shadow-md max-w-full h-auto ${alignClass}" loading="lazy">`;
    };

    renderer.heading = ({ text, depth }) => {
      const escapedText = slugify(text, { lower: true, strict: true });
      return `
        <h${depth} id="${escapedText}" class="group relative text-2xl font-bold mb-6 dark:text-white">
          <a href="#${escapedText}" class="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity" aria-hidden="true">
            <span class="text-gray-400 dark:text-gray-600">🔗</span>
          </a>
          ${text}
        </h${depth}>
      `;
    };

    const rawHtml = marked.parse(article.content, { renderer });
    const htmlContent = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['img'],
      ADD_ATTR: ['target', 'class', 'id', 'rel', 'loading'],
    });

    const pageUrl = `${process.env.BASE_URL}/articles/${article.slug}`;
    res.locals.seo = {
      title: `${article.title} | Tanzanian Galaxy`,
      description: article.excerpt || truncateText(article.content),
      url: pageUrl,
      image: article.headerImageUrl || `${process.env.BASE_URL}/default-share-image.jpg`,
      type: 'article',
      publishedDate: article.createdAt.toISOString(),
      modifiedDate: article.updatedAt.toISOString(),
      authorName: article.author.name
    };

    res.render('pages/articles/show', { article, htmlContent, user: req.user });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

export const renderHomepage = async (req, res) => {
  try {
    const canViewHidden = req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR');
    const visibilityFilter = canViewHidden ? {} : { hidden: false };

    const queryBase = { published: true, ...visibilityFilter };

    const featuredArticles = await Article.find({ ...queryBase, isFeatured: true })
      .populate('authorId')
      .sort({ createdAt: -1 })
      .lean();
    featuredArticles.forEach(a => a.author = a.authorId);

    const popularArticles = await Article.find(queryBase)
      .populate('authorId')
      .sort({ viewCount: -1 })
      .limit(5)
      .lean();
    popularArticles.forEach(a => a.author = a.authorId);

    const latestArticles = await Article.find(queryBase)
      .populate('authorId')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    latestArticles.forEach(a => a.author = a.authorId);

    res.locals.seo = {
      title: 'Tanzanian Galaxy',
      description: 'Welcome to Tanzanian Galaxy',
      url: process.env.BASE_URL,
      image: `${process.env.BASE_URL}/default-share-image.jpg`,
      type: 'website'
    };

    res.render('pages/home', {
      user: req.user,
      featuredArticles,
      popularArticles,
      latestArticles
    });
  } catch (error) {
    console.error('Error fetching homepage articles:', error);
    res.status(500).send('Error loading homepage');
  }
};

export const listAllArticles = async (req, res) => {
  try {
    const canViewHidden = req.user && (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR');
    const visibilityFilter = canViewHidden ? {} : { hidden: false };

    const articles = await Article.find({ published: true, ...visibilityFilter })
      .populate('authorId')
      .sort({ createdAt: -1 })
      .lean();
    articles.forEach(a => a.author = a.authorId);

    res.render('pages/articles/all', {
      user: req.user,
      articles,
      pageTitle: 'All Articles'
    });
  } catch (error) {
    console.error('Error fetching all articles:', error);
    res.status(500).send('Error loading articles');
  }
};

export const toggleFeaturedStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({ slug });

    if (!article) return res.status(404).send('Article not found');

    article.isFeatured = !article.isFeatured;
    await article.save();

    res.redirect(`/articles/${slug}`);
  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.redirect(`/articles/${req.params.slug}`);
  }
};

export const toggleHiddenStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({ slug });

    if (!article) return res.status(404).send('Article not found');

    article.hidden = !article.hidden;
    await article.save();

    res.redirect(`/articles/${slug}`);
  } catch (error) {
    console.error('Error toggling hidden status:', error);
    res.redirect(`/articles/${req.params.slug}`);
  }
};

export const renderMyArticles = async (req, res) => {
  try {
    const userId = req.user.id;
    const myArticles = await Article.find({ authorId: userId })
      .sort({ updatedAt: -1 })
      .lean();

    res.render('pages/articles/my-articles', {
      user: req.user,
      articles: myArticles,
      pageTitle: 'My Articles'
    });
  } catch (error) {
    console.error('Error fetching user articles:', error);
    res.redirect('/');
  }
};

export const renderEditForm = async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await Article.findOne({ slug }).lean();

    if (!article) return res.status(404).send('Article not found');

    if (req.user.id !== article.authorId.toString() && req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
      return res.status(403).send('Forbidden: You do not have permission to edit this article.');
    }

    res.render('pages/articles/edit', { article, user: req.user });
  } catch (error) {
    console.error('Error rendering edit form:', error);
    res.status(500).send('Server Error');
  }
};

export const updateArticle = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, excerpt, action } = req.body;

    const article = await Article.findOne({ slug });
    if (!article) return res.status(404).send('Article not found');
    
    if (req.user.id !== article.authorId.toString() && req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
      return res.status(403).send('Forbidden');
    }

    const finalSlug = await generateUniqueSlug(title);
    
    article.title = title;
    article.content = content;
    article.excerpt = excerpt;
    article.slug = finalSlug;
    article.published = action === 'publish';

    if (req.file) {
      const { publicUrl, fileName } = await processAndUploadImage(
        req.file.buffer,
        req.file.originalname,
        { resize: { width: 960, height: 540 } }
      );
      article.headerImageUrl = publicUrl;
      await UploadedFile.create({
        url: publicUrl, fileName, userId: req.user.id
      });
    }

    await article.save();

    res.redirect(`/articles/${article.slug}`);
  } catch (error) {
    console.error('Error updating article:', error);
    res.redirect(`/`);
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const authors = await User.find({}).lean();
    
    // Manual aggregation due to schema change simplicity
    const leaderboard = [];
    for (let author of authors) {
      const articles = await Article.find({ authorId: author._id, published: true }).select('viewCount').lean();
      const totalViews = articles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
      leaderboard.push({
        username: author.name,
        articleCount: articles.length,
        totalViews
      });
    }

    leaderboard.sort((a, b) => b.totalViews - a.totalViews);

    res.render('pages/leaderboard', { authors: leaderboard, user: req.user });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).render('pages/leaderboard', { authors: [], error: 'Could not load leaderboard' }); 
  }
};
