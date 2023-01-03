const router = require('express').Router();

/* GET home page. */
router.get('/', (req, res) => {
  res.render('./index.html.twig');
});
router.get('/auth', (req, res) => {
  res.render('./auth.html.twig');
});
router.get('/get-forecast-values', (req, res) => {
  res.render('./get-forecast-values.html.twig');
});


module.exports = router;
