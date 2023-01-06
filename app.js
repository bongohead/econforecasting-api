const express = require('express');

// Middlewares
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimiter = require('./middleware').rateLimiter;
const baseRoutes = require('./routes/base');
const v1Routes = require('./routes/v1');
const docsRoutes = require('./routes/docs');
const v0Routes = require('./routes/v0');

const port = 3002;
const path = require('path');


const app = express();
app.listen(port, 300);

// Disable Fingerprinting
app.disable('x-powered-by')

// Use Helmet to define headers for sec
app.use(helmet());

// Enable CORS for all routes
app.use(cors());

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
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
});

module.exports = app;
