var express = require('express');
var bodyParser = require('body-parser');
var config = require('./config/index');

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

require('./routes')(app);

app.listen(config.get('port'));
