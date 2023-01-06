const CONSTANTS = require('dotenv').config({path: '.env'}).parsed;

const router = require('express').Router();
const Pool = require('pg').Pool; // Use Pool for non-transactional queries

const authenticateToken = require('./../middleware').authenticateToken;
const verifyPermissions = require('./../middleware').verifyPermissions;

const pool = new Pool({
	user: CONSTANTS['DB_USER'],
	host: CONSTANTS['DB_HOST'],
	database: CONSTANTS['DB_DATABASE'],
	password: CONSTANTS['DB_PASSWORD'],
	port: CONSTANTS['DB_PORT']
});

const is_invalid_params = function(...required_params) {
	return required_params.some(x => x == null || x === '');
}

/*** Test token ***/
/* Check if authenticateToken works. Require admin permissions.
 *
 */
router.get('/get_forecast_variable', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res) {

	const varname = req.query.varname ?? '';

	if (is_invalid_params(varname)) return res.status(400).send('Missing varname!')

	query_text = 
    `SELECT
		varname, fullname, units, d1, hist_source_freq
    FROM forecast_variables
    WHERE varname = $1::text
    LIMIT 1 `

	pool
		.query({
			text: query_text,
			values: [varname]
			})
		.then(db_result => {
			const data = db_result.rows.map(function(x) {
				return x;
			});

			res.status(200).json(data);
		})
		.catch(err => {
			res.status(200).json({error: 1, error_code: err});
		});
});

module.exports = router;