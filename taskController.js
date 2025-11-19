const LearningTask = require('../models/LearningTask');
const User = require('../models/User');

// GET /tasks - List tasks for the logged-in user
exports.getTasks = async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    let tasks;
    if (role === 'student') {
      // Students: view only their own tasks
      tasks = await LearningTask.find({ userId });
    } else if (role === 'teacher') {
      // Teachers:
      // 1. Get own tasks
      // 2. Get all tasks where userId is a student assigned to this teacher

      // Find students assigned to this teacher
      const students = await User.find({ role: 'student', teacherId: userId }, '_id');
      const studentIds = students.map(s => s._id);

      // Own tasks OR tasks of assigned students
      tasks = await LearningTask.find({
        $or: [
          { userId },
          { userId: { $in: studentIds } },
        ],
      });
    } else {
      return res.status(403).json({ success: false, message: 'Unknown role.' });
    }
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
};

// POST /tasks - Create a new task
exports.createTask = async (req, res, next) => {
  try {
    // Only allow new task IF userId matches logged-in user (self)
    const { userId } = req.user;
    const { title, description, dueDate, progress } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }
    // Progress default/not-started, restrict values
    const allowedProgress = ['not-started', 'in-progress', 'completed'];
    if (progress && !allowedProgress.includes(progress)) {
      return res.status(400).json({ success: false, message: 'Invalid progress state.' });
    }
    // userId from token; ignore any userId passed from body
    const task = await LearningTask.create({
      userId,
      title,
      description,
      dueDate,
      progress: progress || 'not-started',
    });
    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

// PUT /tasks/:id - Update allowed fields for the task owner
exports.updateTask = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { title, description, progress, dueDate } = req.body; // <= add dueDate
    // Task must exist and belong to this user
    const task = await LearningTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    if (String(task.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to update this task.' });
    }
    const allowedProgress = ['not-started', 'in-progress', 'completed'];
    if (progress && !allowedProgress.includes(progress)) {
      return res.status(400).json({ success: false, message: 'Invalid progress state.' });
    }
    // Only allow updating certain fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (progress !== undefined) task.progress = progress;
    if (dueDate !== undefined) task.dueDate = dueDate;
    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

// DELETE /tasks/:id - Only task creator can delete
exports.deleteTask = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const task = await LearningTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    if (String(task.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to delete this task.' });
    }
    await LearningTask.findByIdAndDelete(id);
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
};
