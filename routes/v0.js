const router = require('express').Router();

const Pool = require('pg').Pool; // Use Pool for non-transactional queries
const pool = new Pool({user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD, port: process.env.DB_PORT});

const { authenticateToken, verifyPermissions } = require('./../middleware')
const { is_invalid_params } = require('./../helpers')

/*** Test token ***/
/* Check if authenticateToken works. Require admin permissions.
 *
 */
router.get('/get_forecast_variable', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res) {

	const varname = req.query.varname ?? '';

	if (is_invalid_params(varname)) return res.status(400).send('Missing varname!')

	const query_text = 
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


router.get('get_forecast_hist_values_last_vintage', authenticateToken, verifyPermissions(['admin', 'webapp'], function(req, res) {

	// Returns the last historical data by the last vintage date for the given variable.
	// Takes as input a string/comma-delimited string of varnames, a string/comma-delimited of freqs, and a string/comma-delimited/null of forms
	// Allows selection of:
	//  - 1+ varname (passing none returns nothing)
	//  - 1+ frequency (passing none returns nothing)
	//  - 0+ forms (passing none returns all forms)

	// Inputs for all elements are strings such that they can be casted to VARCHAR in postgresq
	const varname = '{' + (req.query.varname ?? '').split('') + '}';  // If null, set as '{}'
	const freq = '{' + (req.query.freq ?? '').split('') + '}';  // If null, set as '{}'
	const form = '{' + (req.query.freq ?? '').split('') + '}';  // If null, set as '{}'

// Inputs for all elements are strings such that they can be casted to VARCHAR in postgresq
//   i.e. varname = ANY('{gdp, pce}'::VARCHAR[])
// $vars_to_bind = array(
// 	'varname' => '{'.implode(',', (array) $fromAjax['varname'] ?? '').'}',  // If null, set as '{}'
// 	'freq' => '{'.implode(',', (array) $fromAjax['freq'] ?? '').'}', // If null, set as '{}'
// 	'form' => isset($fromAjax['form']) ? '{'.implode(',', (array) $fromAjax['form']).'}' : '', // If null, set as ''
// 	);

// $form_str = $vars_to_bind['form'] != '' ? 'AND form = ANY(:form::VARCHAR[])' : '';

// $col_str = implode(',', array_merge(
// 	isset($fromAjax['varname']) && count((array) $fromAjax['varname']) === 1 ? [] : ['varname'],
// 	isset($fromAjax['freq']) && count((array) $fromAjax['freq']) === 1 ? [] : ['freq'],
// 	isset($fromAjax['form']) && count((array) $fromAjax['form']) === 1 ? [] : ['form'],
// 	['vdate', 'date', 'value']
// 	));


// $forecast_hist_values = $sql -> select("
// SELECT ${col_str}
// FROM
// (
// 	SELECT 
// 		freq, form, date, varname, MAX(vdate) as vdate, last(value, vdate) as VALUE -- Get value corresponding to latest vdate for each date
// 	FROM forecast_hist_values
// 	WHERE 
// 		varname = ANY(:varname::VARCHAR[])
// 		AND freq = ANY(:freq::VARCHAR[])
// 		${form_str}
// 	GROUP BY varname, form, freq, date
// 	ORDER BY varname, form, freq, date
// ) a
// ", $vars_to_bind);

}));



module.exports = router;