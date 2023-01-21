const router = require('express').Router();

const Pool = require('pg').Pool; // Use Pool for non-transactional queries
const pool = new Pool({user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD, port: process.env.DB_PORT});
// https://stackoverflow.com/a/57210469
let types = require('pg').types
types.setTypeParser(1700, val => parseFloat(val));
types.setTypeParser(1082, val => val);

const { authenticateToken, verifyPermissions } = require('./../middleware')
const { is_invalid_params } = require('./../helpers')

/*** Test token ***/
/* Check if authenticateToken works. Require admin permissions.
 *
 */
router.get('/get_forecast_variable', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res, next) {

	if (is_invalid_params(req.query, 'varname')) return res.status(400).send('Missing query parameters')
	const varname = req.query.get('varname') ?? '';

	const query_text = `
	SELECT
		varname, fullname, units, d1, hist_source_freq
    FROM forecast_variables
    WHERE varname = $1::text
    LIMIT 1
	`

	pool.query({text: query_text, values: [varname]})
	.then(db_result => {
		const data = db_result.rows;
		res.status(200).json(data);
	})
	.catch(err => next(err));
});



router.get('/get_hist_obs', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res, next) {

	// Returns the last historical data by the last vintage date for the given variable(s).
	// Each sub-object uniquely represents a variable x frequency.

	// Takes as input a string/comma-delimited string of varnames, a string/comma-delimited of freqs, and a string/comma-delimited/null of forms
	// Allows selection of:
	//  - 1+ varname (passing none returns error)
	//  - null, 1, or 2+ frequency (passing nothing returns highest frequency)

	// Inputs for all elements are strings such that they can be casted to VARCHAR in postgresq
	//   i.e. varname = ANY('{gdp, pce}'::VARCHAR[])

	if (is_invalid_params(req.query, 'varname')) return res.status(400).send('Missing query varname')
	const varnames = (req.query.get('varname') ?? '').split(',').slice(0, 15);  // Returns array of varnames

	if (req.query.get('freq') == null) {
		// Get lowest frequency available for each varname
		const query_text = `
		SELECT
			b.varname, b.freq,
			json_agg(json_build_object('date', b.date, 'vdate', b.vdate, 'value', ROUND(b.d1, 2), 'value2', ROUND(b.d2, 2))) AS data
		FROM 
			(
			SELECT
				varname, freq, MIN(freq_level) OVER (PARTITION BY varname) AS min_freq_level
			FROM 
				(
				SELECT
					varname, freq,
					CASE
						WHEN freq = 'm' THEN 0
						WHEN freq = 'q' THEN 1
						ELSE 2
					END AS freq_level
				FROM forecast_hist_values_v2_latest 
				GROUP BY varname, freq
				) c
			) a
		LEFT JOIN forecast_hist_values_v2_latest b
			ON a.varname = b.varname AND a.freq = b.freq
		WHERE
			a.varname = ANY ($1)
			AND a.min_freq_level = a.min_freq_level	
		GROUP BY b.varname, b.freq
		LIMIT 10000
		`;

		pool.query({text: query_text, values: [varnames]})
		.then(db_result => {
			const data = db_result.rows;
			res.status(200).json(data);
		})
		.catch(err => next(err));

	} else {

		const freq = req.query.get('freq') ?? '';  // Returns array of varnames

		const query_text = `
		SELECT
			varname, freq,
			json_agg(json_build_object('date', date, 'vdate', vdate, 'value', ROUND(d1, 2), 'value2', ROUND(d2, 2))) AS data
		FROM forecast_hist_values_v2_latest
		WHERE
			varname = ANY ($1)
			AND freq = $2
		GROUP BY varname, freq
		LIMIT 10000
		`;

		pool.query({text: query_text, values: [varnames, freq]})
		.then(db_result => {
			const data = db_result.rows;
			res.status(200).json(data);
		})
		.catch(err => next(err));
	}

});



router.get('/get_latest_forecast_obs', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res, next) {

	// Returns the latest forecasts for a given variable.
	// Each result returns group a variable x forecast

	// Allows selection of:
	//  - 1+ varname (passing none returns error)
	//  - null, 1, or 2+ forecasts (passing nothing returns all forecasts)
	//  - null, 1, or 2+ frequency (passing nothing returns highest frequency)

	if (is_invalid_params(req.query, 'varname')) return res.status(400).send('Missing query varname')

	const varnames = (req.query.get('varname') ?? '').split(',').slice(0, 15);  // Returns array of varnames
	const forecasts = req.query.get('forecast') ? req.query.get('forecast').split(',').slice(0, 15) : null;  // Returns array of forecasts

	const include_all_forecasts = forecasts === null;


	if (req.query.get('freq') == null) {

		// Get lowest frequency available for each varname x forecast
		const query_text = `
		SELECT
			b.varname, b.freq, b.forecast,
			MIN(f.shortname) as shortname,
			MIN(f.fullname) AS fullname,
			MIN(f.description) AS description,
			MIN(f.EXTERNAL::INT) AS external,
			MIN(b.vdate) AS vdate,
			json_agg(json_build_object('date', b.date, 'value', ROUND(b.d1, 2), 'value2', ROUND(b.d2, 2))) AS data
		FROM 
			(
			SELECT
				varname, freq, forecast, MIN(freq_level) OVER (PARTITION BY varname) AS min_freq_level
			FROM 
				(
				SELECT
					varname, freq, forecast,
					CASE
						WHEN freq = 'm' THEN 0
						WHEN freq = 'q' THEN 1
						ELSE 2
					END AS freq_level
				FROM forecast_values_v2_latest 
				GROUP BY varname, freq, forecast
				) c
			) a
		LEFT JOIN forecast_values_v2_latest b
			ON a.varname = b.varname AND a.freq = b.freq AND a.forecast = b.forecast
		LEFT JOIN forecasts f ON b.forecast = f.id 
		WHERE
			a.varname = ANY ($1)
			${include_all_forecasts === true ? '' : 'AND a.forecast = ANY ($2)'}
			AND a.min_freq_level = a.min_freq_level	
		GROUP BY b.varname, b.freq, b.forecast
		LIMIT 10000
		`;

		const query_params = (include_all_forecasts === true ? [varnames] : [varnames, forecasts]);

		pool.query({text: query_text, values: query_params})
		.then(db_result => {
			const data = db_result.rows;
			res.status(200).json(data);
		})
		.catch(err => next(err));

	} else {

		const freq = req.query.get('freq') ?? '';  // Returns array of varnames

		const query_text = `
		SELECT
			a.varname, a.freq, a.forecast,
			MIN(f.shortname) as shortname,
			MIN(f.fullname) AS fullname,
			MIN(f.description) AS description,
			MIN(f.EXTERNAL::INT) AS external,
			MIN(f.vdate) AS vdate,
			json_agg(json_build_object('date', date, 'value', ROUND(d1, 2), 'value2', ROUND(d2, 2))) AS data
		FROM forecast_values_v2_latest a
		LEFT JOIN forecasts f ON b.forecast = f.id 
		WHERE
			varname = ANY ($1)
			AND freq = $2::TEXT
			${include_all_forecasts === true ? '' : 'AND forecast = ANY ($3)'}
		GROUP BY a.varname, a.forecast, a.freq
		LIMIT 10000
		`;

		const query_params = (include_all_forecasts === true ? [varnames, freq] : [varnames, freq, forecasts]);

		pool.query({text: query_text, values: query_params})
		.then(db_result => {
			const data = db_result.rows;
			res.status(200).json(data);
		})
		.catch(err => next(err));
	}

});



router.get('/get_monthly_vintage_forecast_obs', authenticateToken, verifyPermissions(['admin', 'webapp']), function(req, res, next) {

	// Returns the monthly vintage forecasts for a given variable. Always assumes one frequency per forecast.

	// Allows selection of:
	//  - 1 varname (passing none returns error)
	//  - 1 forecast (primary forecast)

	if (is_invalid_params(req.query, 'varname')) return res.status(400).send('Missing query varname')
	if (is_invalid_params(req.query, 'forecast')) return res.status(400).send('Missing query forecast')

	const varname = req.query.get('varname') ?? '';
	const forecast = req.query.get('forecast') ?? ''


	// Get lowest frequency available for each varname x forecast
	const query_text = `
	SELECT date, vdate, d1 FROM (
		SELECT date, vdate, d1, agg_vdate, MIN(vdate) OVER (PARTITION BY agg_vdate) AS min_vdate_per_month FROM (
			SELECT 
				date, vdate, d1, DATE(date_trunc('month', vdate)) AS agg_vdate, COUNT(*) OVER (PARTITION BY vdate) AS vdate_count
			FROM forecast_values_v2_all
			WHERE 
				varname = $1::TEXT
				AND forecast = $2::TEXT
				AND vdate < date
				AND vdate >= NOW() - INTERVAL '3 YEARS'
				AND date < vdate + INTERVAL '3 YEARS'
			ORDER BY date, vdate
			) a
		WHERE vdate_count >= 5
		) b 
	WHERE min_vdate_per_month = vdate
	ORDER BY vdate, date
	LIMIT 10000
	`;

	pool.query({text: query_text, values: [varname, forecast]})
	.then(db_result => {
		const data = db_result.rows;
		res.status(200).json(data);
	})
	.catch(err => next(err));


});



/*
<?php
// Returns first forecast for each month
// Takes as input a variable, frequency, form, and 1+ forecasts.
$vars_to_bind = array(
	'varname' => isset($fromAjax['varname']) ? $fromAjax['varname'] : '',  // If null, set as ''
	'freq' => isset($fromAjax['freq']) ? $fromAjax['freq'] : '', // If null, set as ''
	'forecast' => isset($fromAjax['forecast'])? $fromAjax['forecast'] : '', // If null, set as ''
	'form' => isset($fromAjax['form']) ? $fromAjax['form'] : '', // If null, set as ''
	);

// Get first vdates of each month that have at least 5 data counts
$forecast_vintage_values = $sql -> select(
"
SELECT date, vdate, value FROM (
	SELECT date, vdate, value, agg_vdate, MIN(vdate) OVER (PARTITION BY agg_vdate) AS min_vdate_per_month FROM (
		SELECT 
			date, vdate, value, DATE(date_trunc('month', vdate)) AS agg_vdate, COUNT(*) OVER (PARTITION BY vdate) AS vdate_count
		FROM forecast_values
		WHERE 
			varname = :varname
			AND freq = :freq
			AND forecast = :forecast
			AND form = :form
			AND vdate < date
			AND vdate >= NOW() - INTERVAL '3 YEARS'
			AND date < vdate + INTERVAL '3 YEARS'
		ORDER BY date, vdate
		) a
	WHERE vdate_count >= 5
	) b 
WHERE min_vdate_per_month = vdate
ORDER BY vdate, date
", $vars_to_bind);

*/







module.exports = router;