const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a board name'],
      trim: true,
      maxlength: [100, 'Board name cannot exceed 100 characters'],
      default: 'Untitled Board',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Excalidraw scene elements (including soft-deleted tombstones for CRDT merge)
    elements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // Persisted Excalidraw appState subset (e.g. viewBackgroundColor, gridSize)
    appState: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ viewBackgroundColor: '#ffffff', gridSize: null }),
    },
    backgroundColor: {
      type: String,
      default: '#ffffff',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

boardSchema.index({ owner: 1, updatedAt: -1 });
boardSchema.index({ collaborators: 1, updatedAt: -1 });

/**
 * Checks whether a given user is allowed to view and collaborate on this board.
 * @param {string|mongoose.Types.ObjectId} userId - Candidate user ID.
 * @returns {boolean} True if user is owner, collaborator, or board is public.
 */
boardSchema.methods.canAccess = function canAccess(userId) {
  const uid = String(userId);
  const ownerId = String(this.owner?._id || this.owner);
  if (ownerId === uid) return true;
  if (this.collaborators.some((c) => String(c._id || c) === uid)) return true;
  return this.isPublic === true;
};

/**
 * Checks whether a given user is the owner of this board (required for destructive actions).
 * @param {string|mongoose.Types.ObjectId} userId - Candidate user ID.
 * @returns {boolean} True if user owns the board.
 */
boardSchema.methods.isOwner = function isOwner(userId) {
  const ownerId = String(this.owner?._id || this.owner);
  return ownerId === String(userId);
};

const Board = mongoose.model('Board', boardSchema);
module.exports = Board;
