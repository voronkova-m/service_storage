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
            if (err) {
                res.render('error', {message: err.message});
                return;
            } else {
                try {
                    Promise.all(storages.map((storage) => axios.get('http://127.0.0.1:4000/products_storage/' + storage._id)
                    )).then(productsStorage => {
                        res.render('allProducts', {storages: productsStorage.map(products => products.data)});
                    });
                } catch (e) {
                    console.error(e);
                    res.send(err.message);
                }
            }
            ;
        });
    });

    app.get('/all_products_js', function (req, res) {
        Storage.find({}, function (err, storages) {
            if (err) {
                res.render('error', {message: err.message});
                return;
            } else {
                try {
                    Promise.all(storages.map((storage) => axios.get('http://127.0.0.1:4000/products_storage/' + storage._id)
                    )).then(productsStorage => {
                        //res.render('allProducts', {storages: productsStorage.map(products => products.data)});
                        console.log('qwerttt ' + productsStorage.map(products => products.data));
                        res.send(productsStorage.map(products => products.data));
                    });
                } catch (e) {
                    console.error(e);
                    res.send(err.message);
                }
            }
            ;
        });
    });

    app.get('/products_storage/:id', function (req, res) { // вовзращает продукты и их количество на складах с введённым id
        Storage.findOne({_id: req.params.id}, async function (err, storage) {
            if (storage == undefined) {
                res.send(err.message);
            } else {
                try {
                    Promise.all(storage.idRack.map((rack) => axios.get('http://127.0.0.1:4000/products_rack/' + rack._id)
                    )).then(productsStorage => {
                        //console.log(productsStorage.map(products => products.data));
                        res.send({
                            idStorage: storage._id,
                            nameStorage: storage.name,
                            rack: productsStorage.map(products => products.data)
                        });
                    });
                } catch (e) {
                    console.error(e);
                    res.send(err.message);
                }
            }
            ;
        });
    });


    app.get('/products_rack/:id', function (req, res) {      // вовзращает продукты и их количество на стеллаже с введённым id
        Rack.findOne({_id: req.params.id}, function (err, rack) {
            if (rack == undefined) {
                res.render('error', {message: "Стеллажа с таким id нет"});
            } else {
                let array = [];
                rack.products.forEach(function (product, i, products) {
                    array[i] = product.idProduct;
                });
                const url = {
                    uri: 'http://127.0.0.1:3000/get_list_products/',
                    body: JSON.stringify({arr: array}),
                    method: 'GET',
                    headers: {'Content-Type': 'application/json'}
                };
                request(url, function (error, res2) {
                    let productsRack = [];
                    let products = JSON.parse(res2.body);

                    products.forEach(function (product, i, products) {
                        productsRack[i] = product;
                        productsRack[i].countProduct = rack.products[i].countProduct;
                    });
                    //res.render('rack', {typeRack: rack.type, products: productsRack});
                    res.send({idRack: rack._id, typeRack: rack.type, products: productsRack});
                });
            }
        });
    });

    app.post('/add_product/', function (req, res) {
        let idStorage = req.body['storage_id'];
        let idRack = req.body['rack_id'];
        let idProduct = req.body['product_id'];
        Storage.findOne({_id: idStorage}, function (err, storage) {
            if (storage == undefined) {
                res.render('error', {message: "Склада с таким id нет"});
            } else {
                Rack.findOne({_id: idRack}, function (err, rack) {
                    if (rack == undefined) {
                        res.render('error', {message: "Стеллажа с таким id нет"});
                    } else {
                        rack.products.forEach(function (product, i, products) {
                            if (product.idProduct == idProduct) {
                                Rack.updateOne(
                                    {
                                        "_id": idRack, "products.idProduct": product.idProduct
                                    },
                                    {
                                        $inc: {"products.$.countProduct": 1}
                                    }, function () {
                                        if (err) {
                                            res.render('error', {message: err.message});
                                            return;
                                        }
                                        res.redirect("http://127.0.0.1:4000/all_products");
                                    });
                            }
                        });
                    }
                });
            }
        });
    });

    app.post('/delete_product/', function (req, res) {
        let idStorage = req.body['storage_id'];
        let idRack = req.body['rack_id'];
        let idProduct = req.body['product_id'];
        Storage.findOne({_id: idStorage}, function (err, storage) {
            if (storage == undefined) {
                res.render('error', {message: "Склада с таким id нет"});
            } else {
                Rack.findOne({_id: idRack}, function (err, rack) {
                    if (rack == undefined) {
                        res.render('error', {message: "Стеллажа с таким id нет"});
                    } else {
                        rack.products.forEach(function (product, i, products) {
                            if (product.idProduct == idProduct) {
                                let count = rack.products[i].countProduct;
                                if (count > 1) {
                                    Rack.updateOne(
                                        {"_id": idRack, "products.idProduct": product.idProduct},
                                        {$inc: {"products.$.countProduct": -1}}, function () {
                                            if (err) {
                                                res.render('error', {message: err.message});
                                                return;
                                            }
                                            res.redirect("http://127.0.0.1:4000/all_products");
                                        });
                                } else if (count == 1) {
                                    Rack.update(
                                        {"_id": idRack, "products.idProduct": product.idProduct},
                                        {$pop: {products: 1}}, function () {
                                            if (err) {
                                                res.render('error', {message: err.message});
                                                return;
                                            }
                                            res.redirect("http://127.0.0.1:4000/all_products");
                                        });
                                }
                            }
                        });
                    }
                });
            }
        });
    });


    app.get('/products_names/:names', function (req, res) {      // вовзращает продукты с введённым name
        let array = req.params.names.split(',');
        const url = {
            uri: 'http://127.0.0.1:4000/all_products_js/',
            body: JSON.stringify({arr: array}),
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        };
        request(url, function (error, res2) {
            let productsRack = [];
            console.log('fff ' + res2.body);
            let products = JSON.parse(res2.body);
            console.log('zzz ' + products);
            products.forEach(function (product, i, products) {
                productsRack[i] = product;
                //productsRack[i].countProduct = rack.countProducts[i];
            });
            productsRack.find({$or: [{name: array}, {type: array}, {trademark: array}]}, function (err, products) {
                if (products == undefined) {
                    res.send(err.message);
                } else {
                    res.send(products);
                }
            });
            res.send(productsRack);
        });
    });

};
