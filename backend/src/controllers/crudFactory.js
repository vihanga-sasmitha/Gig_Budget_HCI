const mongoose = require('mongoose');
const { AppError, asyncHandler } = require('../utils/errors');

function ownerFilter(req) {
  return { ownerId: req.user._id, deletedAt: null };
}

function idQuery(req) {
  const id = req.params.id;
  const clauses = [{ clientId: id }];
  if (mongoose.isValidObjectId(id)) {
    clauses.unshift({ _id: id });
  }
  return { ...ownerFilter(req), $or: clauses };
}

function createCrudController(Model, { mapCreate, mapUpdate } = {}) {
  return {
    list: asyncHandler(async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const skip = Number(req.query.skip) || 0;
      const items = await Model.find(ownerFilter(req)).sort({ updatedAt: -1 }).skip(skip).limit(limit);
      res.json({ ok: true, data: items });
    }),

    get: asyncHandler(async (req, res) => {
      const item = await Model.findOne(idQuery(req));
      if (!item) throw new AppError('Not found', 404, 'NOT_FOUND');
      res.json({ ok: true, data: item });
    }),

    create: asyncHandler(async (req, res) => {
      const body = mapCreate ? mapCreate(req.body, req) : req.body;
      if (body.idempotencyKey) {
        const existing = await Model.findOne({
          ownerId: req.user._id,
          idempotencyKey: body.idempotencyKey,
        });
        if (existing) return res.status(200).json({ ok: true, data: existing, idempotentReplay: true });
      }
      const item = await Model.create({ ...body, ownerId: req.user._id });
      res.status(201).json({ ok: true, data: item });
    }),

    update: asyncHandler(async (req, res) => {
      const item = await Model.findOne(idQuery(req));
      if (!item) throw new AppError('Not found', 404, 'NOT_FOUND');
      const body = mapUpdate ? mapUpdate(req.body, req, item) : req.body;
      Object.assign(item, body, { serverRevision: (item.serverRevision || 1) + 1 });
      await item.save();
      res.json({ ok: true, data: item });
    }),

    remove: asyncHandler(async (req, res) => {
      const item = await Model.findOne(idQuery(req));
      if (!item) throw new AppError('Not found', 404, 'NOT_FOUND');
      item.deletedAt = new Date();
      item.serverRevision = (item.serverRevision || 1) + 1;
      await item.save();
      res.json({ ok: true, data: { deleted: true, clientId: item.clientId } });
    }),
  };
}

module.exports = { createCrudController, ownerFilter, idQuery };
