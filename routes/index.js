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
                    res.send({idRack: rack._id, typeRack: rack.type, products: productsRack});
                });
            }
        });
    });

    app.post('/append_product/', function (req, res) {
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
                        rack.products.forEach(function (product) {
                            if (product.idProduct == idProduct) {
                                Rack.updateOne(
                                    {"_id": idRack, "products.idProduct": product.idProduct},
                                    {$inc: {"products.$.countProduct": 1}}, function () {
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

    app.post('/reduce_product/', function (req, res) {
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

    app.get('/products_names/:values', function (req, res) {      // вовзращает продукты с введёнными значениями
        let array = req.params.values.split(',');
        const url = {
            uri: 'http://127.0.0.1:3000/get_list_products_arr/',
            body: JSON.stringify({arr: array}),
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        };
        request(url, function (error, res2) {
            let productsRack = [];
            let products = JSON.parse(res2.body);
            products.forEach(function (product, i, products) {
                productsRack[i] = product;
            });
            //res.render('filtrProducts', {products: productsRack, filters: array});
            res.send(productsRack);
        });
    });

    app.post('/add_storage', function (req, res) {
        let nameStorage = req.body['name_storage'];
        var newStorage = new Storage({name: nameStorage, idRack: []});
        newStorage.save(function (err) {
            if (err) {
                res.render('error', {message: err.message});
                return;
            }
            res.redirect("http://127.0.0.1:4000/all_products")
        });
    });

    app.post('/add_rack', function (req, res) {
        let typeRack = req.body['type_rack'];
        let idStorage = req.body['storage_id'];
        var newRack = new Rack({type: typeRack, products: []});
        newRack.save(function (err, rack) {
            if (err) {
                res.render('error', {message: err.message});
                return;
            }
            Storage.updateOne({_id: idStorage}, {
                $push: {
                    idRack: rack._id
                }
            }, function (err) {
                if (err) {
                    res.render('error', {message: err.message});
                    return;
                }
                res.redirect("http://127.0.0.1:4000/all_products")
            });
        });
    });

    app.post('/delete_rack', function (req, res) {
        let idRack = req.body['rack_id'];
        let idStorage = req.body['storage_id'];
        console.log('vvv' + idRack);
        Storage.updateOne({_id: idStorage, "idRack": idRack}, {$pop: {"idRack": 1}}
            , function (err) {
                if (err) {
                    res.render('error', {message: err.message});
                    return;
                } else {
                    console.log('zzz' + idRack);
                    Rack.remove({"_id": idRack}, function (err) {
                        if (err) {
                            res.render('error', {message: err.message});
                            console.log(err.message);
                            return;
                        } else {
                            console.log('aaa' + idRack);
                            res.redirect("http://127.0.0.1:4000/all_products")
                        }
                    });
                }
            });
    });


    app.post('/delete_storage', function (req, res) {
        let idStorage = req.body['storage_id'];
        console.log('vvv' + idRack);
        Storage.remove({_id: idStorage}, function (err) {
            if (err) {
                res.render('error', {message: err.message});
                console.log(err.message);
                return;
            }
            res.redirect("http://127.0.0.1:4000/all_products")
        });
    });

    app.post('/add_product', function (req, res) {
        let idRack = req.body['rack_id'];
        let idStorage = req.body['storage_id'];
        let typeRack = req.body['type_rack'];
        request('http://127.0.0.1:4000/products_names/' + typeRack, function (err, res2, body) {
            if (err) {
                res2.render('error', {message: err.message});
                return;
            }
            var products = body;
            products = JSON.parse(products);
            res.render('addProduct', {
                products: products,
                typeRack: typeRack,
                idRack: idRack,
                idStorage: idStorage
            });
        });
    });

    app.post('/rack/:id/add_old_product', function (req, res) {
        let chbox = req.body;
        let idRack = req.params.id;
        //let typeRack = req.body['type_rack'];
        Object.keys(chbox).forEach(function (product) {
            Rack.updateOne({_id: idRack}, {
                $push: {
                    products: {idProduct: product, countProduct: 1}
                }
            }, function (err) {
                if (err) {
                    res.render('error', {message: err.message});
                    return;
                }
                res.redirect("http://127.0.0.1:4000/all_products")
            });
        })
    });

    app.post('/add_new_product', function (req, res) {
        let article = req.body.article;
        let type = req.body.type;
        let name = req.body.name;
        let trademark = req.body.trademark;
        let idRack = req.body.idRack
        const url = {
            uri: 'http://127.0.0.1:3000/add_product_storage/',
            body: JSON.stringify({article: article, type: type, name: name, trademark: trademark}),
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        };
        request(url, function (error, res2) {
            let productsRack = [];
            let product = JSON.parse(res2.body);
            product1 = {idProduct: product._id, countProduct: 1}
            Rack.updateOne({_id: idRack}, {
                $push: {
                    products: product1
                }
            }, function (err) {
                if (err) {
                    res.render('error', {message: err.message});
                    return;
                }
                res.redirect("http://127.0.0.1:4000/all_products")
            });
        });
    });
};
