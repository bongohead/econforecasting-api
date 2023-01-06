const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit').rateLimit;

module.exports = {

	authenticateToken: function(req, res, next) {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];

		if (token == null) {
			return res.status(403).send('Missing token');
		}

		jwt.verify(token, String(process.env.TOKEN_SECRET), (err, decoded_token) => {
			if (err) return res.status(403).send('Invalid token')
			// https://stackoverflow.com/questions/18875292/passing-variables-to-the-next-middleware-using-next-in-express-js
			res.locals.username = decoded_token['username']
			res.locals.auth_level = decoded_token['auth_level']
			next()
		});
	},

	// https://stackoverflow.com/questions/52648102/how-to-pass-a-parameter-to-middleware-function-in-express-js
	// https://stackoverflow.com/questions/12737148/creating-a-expressjs-middleware-that-accepts-parameters
	verifyPermissions: function(allowed_auth_levels = ['admin']) {
		return function(req, res, next) {
			if (res.locals.auth_level == null || !allowed_auth_levels.includes(res.locals.auth_level)) {
				return res.status(403).send('Insufficient permissions')
			}
			next()
		}
	},

	// App-level middleware (above are tracked to specific routes)
	rateLimiter: rateLimit({
		windowMs: 1 * 15 * 60 * 1000, // 1 hrs in milliseconds
		max: 1000, // 100 requests for each IP per window
		message: 'max 1000 requests per hour',
		standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	}),


};
