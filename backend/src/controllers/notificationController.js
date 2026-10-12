const Notification = require('../models/Notification');
const { createCrudController } = require('./crudFactory');
const { asyncHandler, AppError } = require('../utils/errors');

const base = createCrudController(Notification);
exports.list = base.list;
exports.create = base.create;
exports.remove = base.remove;

exports.markRead = asyncHandler(async (req, res) => {
  const item = await Notification.findOne({
    ownerId: req.user._id,
    deletedAt: null,
    $or: [{ _id: req.params.id }, { clientId: req.params.id }],
  });
  if (!item) throw new AppError('Not found', 404, 'NOT_FOUND');
  item.readAt = new Date();
  item.serverRevision += 1;
  await item.save();
  res.json({ ok: true, data: item });
});
