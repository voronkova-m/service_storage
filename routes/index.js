var Storage = require('../models/storage').Storage;
var Rack = require('../models/rack').Rack;
const request = require('request');


module.exports = function (app) {
    app.get('/', function (req, res) {
        res.render('index');
    });


    app.get('/rack/:id', function (req, res) {      // вовзращает продукты и их количество на стеллаже с введённым id
        console.log(req.params.id);
        Rack.findOne({_id: req.params.id}, function (err, rack) {
            if (rack == undefined) {
                res.render('error', {message: "Стеллажа с таким id нет"});
            } else {
                console.log('123 ' + JSON.stringify({arr: rack.idProducts}));
                var clientServerOptions = {
                    uri: 'http://127.0.0.1:3000/get_list_products/',
                    body: JSON.stringify({arr: rack.idProducts}),
                    method: 'GET',
                    headers:{'Content-Type': 'application/json'}
                };
                request(clientServerOptions, function (error, res2) {
                    console.log('vvv' + JSON.parse(res2.body));
                    var productsRack = [];
                    var products = JSON.parse(res2.body);
                    products.forEach(function (product, i, products) {
                        productsRack[i] = product;
                        productsRack[i].countProduct = rack.countProducts[i];
                    });
                    console.log("zzz " + rack.type, productsRack, rack.countProducts);
                    res.render('rack', {typeRack: rack.type, products: productsRack});
                });
            }
        });
    });
};
