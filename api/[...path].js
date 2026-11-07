const app = require('../server/index');

module.exports = (req, res) => {
  // Ensure req.url matches Express /api mounts
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
