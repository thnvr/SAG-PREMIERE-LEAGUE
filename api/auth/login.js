const app = require('../../server/index');

module.exports = (req, res) => {
  req.url = '/api/auth/login';
  return app(req, res);
};
