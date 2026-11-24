const Board = require('../models/Board');
const { createSceneStore } = require('./sceneStore');

// Shared process-wide SceneStore singleton bound to the Mongoose Board model.
module.exports = createSceneStore({ BoardModel: Board });
