var express    = require('express');
var fs         = require('fs');
var app        = express();
var bodyParser = require('body-parser')

app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.redirect('editorserver.html');
});

app.post('/save', function (req, res) {
    fs.writeFileSync('/tmp/testfile', req.body.lorem);
    res.json({status: 0});
});

app.use(express.static('.'));

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

  console.log('NANO-8 editor listening at http://%s:%s', host, port);
});