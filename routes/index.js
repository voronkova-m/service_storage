var Storage = require('../models/storage').Storage;
var Rack = require('../models/rack').Rack;
const request = require('request');
const axios = require('axios');

module.exports = function (app) {
    app.get('/', function (req, res) {
        res.render('index');
    });

    app.get('/all_products', function (req, res) {
        Storage.find({}, function (err, storages) {
            if (err){
                res.render('error', {message: err.message});
                return;
            }
            console.log(storages);
            res.render('allProducts', {allStorage: storages});
        });
    });

    app.get('/products_storage/:id',  function (req, res) {
        Storage.findOne({_id: req.params.id}, async function (err, storage) {
                if (storage == undefined) {
                    res.send(err.message);
                } else {
                    try{
                        Promise.all(storage.idRack.map((rack)=>  axios.get('http://127.0.0.1:4000/products_rack/' + rack._id)
                        )).then(productsStorage => {
                            res.send(productsStorage.map(products => products.data)
                            );
                        });
                    } catch (e) {
                        console.error(e);
                        res.send(err.message);
                    }
                };
            });
        });


    app.get('/products_rack/:id', function (req, res) {      // вовзращает продукты и их количество на стеллаже с введённым id
        Rack.findOne({_id: req.params.id}, function (err, rack) {
            if (rack == undefined) {
                res.render('error', {message: "Стеллажа с таким id нет"});
            } else {
                const url = {
                    uri: 'http://127.0.0.1:3000/get_list_products/',
                    body: JSON.stringify({arr: rack.idProducts}),
                    method: 'GET',
                    headers:{'Content-Type': 'application/json'}
                };
                request(url, function (error, res2) {
                    let productsRack = [];
                    let products = JSON.parse(res2.body);
                    products.forEach(function (product, i, products) {
                        productsRack[i] = product;
                        productsRack[i].countProduct = rack.countProducts[i];
                    });
                    //res.render('rack', {typeRack: rack.type, products: productsRack});
                    res.send({typeRack: rack.type, products: productsRack});
                });
            }
        });
    });
};
