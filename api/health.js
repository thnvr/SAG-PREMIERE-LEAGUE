const app = require('../server/index');

module.exports = (req, res) => {
  req.url = '/api/health';
  return app(req, res);
};
