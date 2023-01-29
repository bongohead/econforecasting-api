require('dotenv').config();
const express = require('express');

// Middlewares
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimiter = require('./middleware').rateLimiter;

// Routes
const baseRoutes = require('./routes/base');
const v1Routes = require('./routes/v1');
const docsRoutes = require('./routes/docs');
const v0Routes = require('./routes/v0');

const port = 3002;
const path = require('path');
const { json } = require('body-parser');

const app = express();

app.listen(port, 300);

// Disable Fingerprinting
app.disable('x-powered-by')

// Set query parser https://expressjs.com/en/4x/api.html#app.set
app.set('query parser', (queryString) => {
  return new URLSearchParams(queryString);
});

// Use Helmet to define headers for sec
app.use(helmet());

// Enable CORS for all routes
const allowlist = ['https://dev1.econscale.com', 'https://dev.econscale.com', 'https://econforecasting.com']
const corsOptionsDelegate = function (req, callback) {
  const origin = (allowlist.indexOf(req.header('Origin')) !== -1) ? true : false;
  const corsOptions = {
    origin: origin,
    methods: ['GET', 'POST'],
    maxAge: 600
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}
app.use(cors(corsOptionsDelegate));

// Use body-parser as middleware to decode POST content
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Parse cookies
app.use(cookieParser());

// Use rate limiter
app.use(rateLimiter);

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));


app.use('/', baseRoutes);
app.use('/v0', v0Routes);
app.use('/v1', v1Routes);
app.use('/docs', docsRoutes);


// 404 and 500 message
app.use((req, res, next) => {
  res.status(404).send("That page doesn't exist!")
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({error: err});
});


module.exports = app;