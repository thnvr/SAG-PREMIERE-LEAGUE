const app = require('../../server/index');

module.exports = (req, res) => {
  req.url = '/api/auth/me';
  return app(req, res);
};
