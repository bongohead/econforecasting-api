const CONSTANTS = require('dotenv').config({path: '.env'}).parsed;

const router = require('express').Router();

const Pool = require('pg').Pool; // Use Pool for non-transactional queries
const pool = new Pool({user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD, port: process.env.DB_PORT});

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // random numbers

const { authenticateToken, verifyPermissions } = require('./../middleware')
const { is_invalid_params } = require('./../helpers')



/*** Default routes ***/
router.get('/', function(req, res) {
	res.json({success: 0, error: "invalid request (wrong request type)!"});
});

router.post('/', function(req, res) {
	res.json({success: 0, error: "invalid request (empty)"});
});

router.get('/get_token', function(req, res) {
	res.json({success: 0, error: "invalid request (wrong request type!)"});
});




/*** Check hash result  ***/
/* Testing only - use to generate hash for setting initial superadmin user directly in SQL.
 *
 */
router.post('/get_hash', function(req, res) {

	const [auth_key] = [req.body.auth_key];

	if (is_invalid_params(req.body, auth_key)) return res.status(400).send('Missing auth_key!');

	bcrypt.genSalt(10)
		.then(salt => {
			return bcrypt.hash(auth_key, salt)
		}).then(hash =>
			res.status(200).json({success: 1, result: hash})
		);
});



/*** Get token ***/
/* Check if POST username and PK matches a database entry.
 * If so, return a JWT with username + auth_level.
 * https://www.akana.com/sites/default/files/image/2020-12/image-blog-what-is-jwt_0.png
 */
router.post('/get_token', function(req, res) {

	const [username, auth_key] = [req.body.username, req.body.auth_key];

	if (is_invalid_params(username, auth_key)) return res.status(400).send('Missing auth key!');

	pool
		.query({
			text:
				`SELECT
					username,
					auth_key,
					auth_level,
					is_active
				FROM api_v1_credentials
				WHERE username = $1::text
				LIMIT 1`,
			values: [username]
			})
		.then(db_result => {
			if (db_result.rows.length !== 1) {
				res.status(200).json({success: 0, error_message: 'invalid username or auth_key!'});
				return;
			}

			const db_entry = db_result.rows[0];

			bcrypt.compare(auth_key, db_entry.auth_key, function(e, is_valid) {
				if (is_valid == false) {
					res.status(200).json({success: 0, error_message: 'invalid username or auth_key'});
					return;
				}
				if (db_entry.is_active === false) {
					res.status(200).json({success: 0, error_message: 'account deactivated'});
					return;
				}
				const token = jwt.sign(
					{username: db_entry.username, auth_level: db_entry.auth_level},
					process.env.TOKEN_SECRET,
					{expiresIn: '1h'}
				);
				res.status(200).json({success: 1, result: token});
			});
		})
		.catch(err => {
			res.status(200).json({success: 0, error_message: 'unknown error'});
		});
});


/*** Test token ***/
/* Check if authenticateToken works. Require admin permissions.
 *
 */
router.get('/get_test', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res) {

	const varname = 'test';

	if (is_invalid_params(varname)) res.status(400).send('Missing varname!')

	const query_text = `SELECT $1::text AS butt`

	pool
		.query({
			text: query_text,
			values: [varname]
			})
		.then(db_result => {

			const data = db_result.rows.map(function(x) {
				return {
					col1: x.butt
				}
			});

			res.status(200).json({success: 1, result: data});
		})
		.catch(err => {
			res.status(200).json({success: 0, username: res.locals.user, result: err});
		});
});


/*** Add a new user (from superadmin only) ***/
/* Requires a user with admin access.
 * Username is required in POST body; other values optional.
 * If pk isn't set, one will be set and returned automatically.
 */
router.post('/add_user', authenticateToken, verifyPermissions(['admin']), function(req, res) {

	const username = req.body.username;
	const auth_key = req.body.auth_key || crypto.randomBytes(10).toString('hex');
	const auth_level = req.body.auth_level || 'business';
	const is_active = Boolean(Number(req.body.is_active) || 1);

	if (is_invalid_params(username)) res.status(400).send('Missing username!')

	bcrypt.genSalt(10)
		.then(salt => {
			return bcrypt.hash(auth_key, salt)
		}).then(hash => {

			const query = {
				text:
				`
				INSERT INTO api_v1_credentials (username, auth_key, auth_level, is_active)
				VALUES ($1, $2, $3, $4)
				`,
				values: [username, hash, auth_level, is_active]
			};

			pool.query(query)
				.then(db_result => {
					return res.status(200).json({success: 1, result: {auth_key: auth_key, rows: db_result.rows}});
				})
				.catch(err => {
					return res.status(200).json({success: 0, result: err});
				});

		});
});



/*** Get obs ****/
/***
Note that anything that passes through authenticateToken will have access to the req.user key
***/
router.post('/get_obs_all_vintages', authenticateToken, function(req, res) {

	const varname = req.query.varname;
	const freq = req.query.freq;
	const min_vdate = req.query.min_vdate || '2000-01-01';
	const max_vdate = req.query.max_vdate || '9999-12-31';

	if (
		varname == null || varname === '' || freq == null || !['m', 'q'].includes(freq) ||
		min_vdate.match(/^\d{4}-\d{2}-\d{2}$/) === null || max_vdate.match(/^\d{4}-\d{2}-\d{2}$/) === null
		) {
		res.statusMessage = 'invalid parameters';
		res.status(400).end();
		return;
	}

	const query_text =
		`SELECT
			f.shortname,
			TO_CHAR(vdate, 'yyyy-mm-dd') AS vdate,
			TO_CHAR(date, 'yyyy-mm-dd') AS date,
			value
		FROM forecast_values v
		LEFT JOIN forecasts f ON v.forecast = f.id
		WHERE
			varname = $1::text
			AND form = 'd1'
			AND freq = $2::text
			AND f.external = FALSE
			AND forecast != 'now'
			AND vdate >= $3::date
			AND vdate <= $4::date
		ORDER BY forecast, vdate, date
		LIMIT 10000`

	pool
		.query({
			text: query_text,
			values: [varname, freq, min_vdate, max_vdate]
			})
		.then(db_result => {
			const data = db_result.rows.map(function(x) {
				return {
					forecast: x.shortname,
					vdate: x.vdate,
					date: x.date,
					value: Number(x.value)
				}
			});

			res.status(200).json({success: 1, user: req.user, freq: freq, varname: varname, count: data.length, result: data});

		})
		.catch(err => {
			res.status(200).json({success: 0, user: req.user, freq: freq, varname: varname, result: err});
		});
});


/*** Get obs for a varname for last vintage ***/
router.post('/get_obs_last_vintage', authenticateToken, function(req, res) {

	const varname = req.query.varname;
	const freq = req.query.freq;

	if (varname == null || varname === '' || freq == null || !['m', 'q'].includes(freq)) {
		res.statusMessage = 'invalid parameters';
		res.status(400).end();
		return;
	}
	const query_text =
		`SELECT
			f.shortname,
			TO_CHAR(vdate, 'yyyy-mm-dd') AS vdate,
			TO_CHAR(date, 'yyyy-mm-dd') AS date,
			value
		FROM
		(
			SELECT forecast, freq, varname, vdate, date, value, MAX(vdate) OVER (partition by forecast, freq, varname) AS max_vdate
			FROM
			(
				SELECT
					forecast, freq, date, varname, MAX(vdate) as vdate, last(value, vdate) as VALUE
				FROM forecast_values
				WHERE
					varname = $1::text
					AND form = 'd1'
					AND freq = $2::text
					AND forecast != 'now'
				GROUP BY forecast, varname, freq, date
				ORDER BY forecast, varname, freq, date
			) a
		) b
		LEFT JOIN forecasts f ON b.forecast = f.id
		WHERE max_vdate = vdate AND f.external = FALSE
		ORDER BY vdate, date
		LIMIT 10000`;

	pool
		.query({
			text: query_text,
			values: [varname, freq]
			})
		.then(db_result => {

			const data = db_result.rows.map(function(x) {
				return {
					forecast: x.shortname,
					vdate: x.vdate,
					date: x.date,
					value: Number(x.value)
				}
			});

			res.status(200).json({success: 1, user: req.user, freq: freq, varname: varname, count: data.length, result: data});
		})
		.catch(err => {
			res.status(200).json({success: 0, user: req.user, freq: freq, varname: varname, result: err});
		});
});




module.exports = router;
