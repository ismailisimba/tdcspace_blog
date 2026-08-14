import User from '../models/User.js';
import UploadedFile from '../models/UploadedFile.js';
import { deleteFile as deleteFileFromGCS } from '../services/storage.js';

// Render the current user's profile page
export const renderProfile = async (req, res) => {
    try {
        const userWithFiles = await User.findById(req.user.id).lean();
        if (!userWithFiles) {
            return res.status(404).send('User not found.');
        }

        const files = await UploadedFile.find({ userId: req.user.id }).sort({ createdAt: 'desc' }).lean();
        userWithFiles.uploadedFiles = files;

        res.render('pages/profile', {
            user: userWithFiles,
            pageTitle: 'My Profile',
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.redirect('/');
    }
};

// Handle deletion of an uploaded file
export const deleteUploadedFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.id;

        const file = await UploadedFile.findById(fileId);

        if (!file || file.userId.toString() !== userId) {
            return res.status(403).send('Forbidden: You do not have permission to delete this file.');
        }

        await deleteFileFromGCS(file.fileName);
        await UploadedFile.findByIdAndDelete(fileId);

        res.redirect('/profile');
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).send('Failed to delete file.');
    }
};

// --- ADMIN CONTROLLERS ---

export const renderUserManagement = async (req, res) => {
    try {
        const allUsers = await User.find({}).sort({ createdAt: 'desc' }).lean();
        res.render('pages/admin/users', {
            user: req.user,
            users: allUsers,
            pageTitle: 'User Management'
        });
    } catch (error) {
        console.error('Error fetching users for admin panel:', error);
        res.redirect('/');
    }
};

export const toggleModerator = async (req, res) => {
    try {
        const { userId } = req.params;
        const userToUpdate = await User.findById(userId);

        if (!userToUpdate) {
            return res.status(404).send('User not found.');
        }

        if (userToUpdate.role === 'ADMIN') {
            return res.status(403).send('Cannot change the role of an Admin.');
        }

        userToUpdate.role = userToUpdate.role === 'USER' ? 'MODERATOR' : 'USER';
        await userToUpdate.save();

        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error toggling moderator status:', error);
        res.redirect('/admin/users');
    }
};

export const toggleBan = async (req, res) => {
    try {
        const { userId } = req.params;
        const userToUpdate = await User.findById(userId);

        if (!userToUpdate) {
            return res.status(404).send('User not found.');
        }

        if (userToUpdate.role === 'ADMIN') {
            return res.status(403).send('Cannot ban an Admin.');
        }

        userToUpdate.isBanned = !userToUpdate.isBanned;
        await userToUpdate.save();

        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error toggling ban status:', error);
        res.redirect('/admin/users');
    }
};
