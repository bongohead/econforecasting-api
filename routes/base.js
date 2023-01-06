const router = require('express').Router();

/*** Default routes ***/
router.get('/', function(req, res) {
	res.status(404).send("Oh uh, something went wrong");
});

module.exports = router;