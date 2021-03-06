var Storage = require('../models/storage').Storage;
var Rack = require('../models/rack').Rack;
const request = require('request');
const passport = require('passport');
const axios = require('axios');

let auth = passport.authenticate('jwt', {
    session: false
});


module.exports = function (app) {
    app.get('/', function (req, res) {
        res.render('index');
    });

    app.get('/all-products', auth, async function (req, res) {
        await Storage.find({}, function (err, storages) {
            if (err) {
                res.render('error', {message: err.message});
                return;
            } else {
                try {
                    Promise.all(storages.map((storage) => axios.get('http://127.0.0.1:4000/products-storage/' + storage._id,
                        {headers: {
                                Authorization: req.headers.authorization//the token is a variable which holds the token
                            }})
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

    app.get('/all-products-js', auth, function (req, res) {
        Storage.find({}, function (err, storages) {
            if (err) {
                res.render('error', {message: err.message});
                return;
            } else {
                try {
                    Promise.all(storages.map((storage) => axios.get('http://127.0.0.1:4000/products-storage/' + storage._id,
                        {headers: {
                                Authorization: req.headers.authorization//the token is a variable which holds the token
                            }})
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

    app.get('/products-storage/:id', auth, function (req, res) { // вовзращает продукты и их количество на складах с введённым id
        Storage.findOne({_id: req.params.id}, async function (err, storage) {
            if (storage == undefined) {
                res.send(err.message);
            } else {
                try {
                    Promise.all(storage.idRack.map((rack) => axios.get('http://127.0.0.1:4000/products-rack/' + rack._id,
                        {headers: {
                                Authorization: req.headers.authorization//the token is a variable which holds the token
                            }})
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


    app.get('/products-rack/:id', auth, function (req, res) {      // вовзращает продукты и их количество на стеллаже с введённым id
        Rack.findOne({_id: req.params.id}, function (err, rack) {
            if (rack == undefined) {
                res.render('error', {message: "Стеллажа с таким id нет"});
            } else {
                let array = [];
                rack.products.forEach(function (product, i, products) {
                    array[i] = product.idProduct;
                });
                const url = {
                    uri: 'http://127.0.0.1:3000/get-list-products/',
                    body: JSON.stringify({arr: array}),
                    method: 'GET',
                    headers: {'Content-Type': 'application/json', 'Authorization': req.headers.authorization}
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

    app.post('/append-product/', auth, function (req, res) {
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
                                        res.redirect("http://127.0.0.1:4000/all-products");
                                    });
                            }
                        });
                    }
                });
            }
        });
    });

    app.post('/reduce-product/', auth, function (req, res) {
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
                                            res.redirect("http://127.0.0.1:4000/all-products");
                                        });
                                } else if (count == 1) {
                                    Rack.update(
                                        {"_id": idRack, "products.idProduct": product.idProduct},
                                        {$pop: {products: 1}}, function () {
                                            if (err) {
                                                res.render('error', {message: err.message});
                                                return;
                                            }
                                            res.redirect("http://127.0.0.1:4000/all-products");
                                        });
                                }
                            }
                        });
                    }
                });
            }
        });
    });

    app.get('/products-names/:values', auth, function (req, res) {      // вовзращает продукты с введёнными значениями
        let array = req.params.values.split(',');
        const url = {
            uri: 'http://127.0.0.1:3000/get-list-products-arr/',
            body: JSON.stringify({arr: array}),
            method: 'GET',
            headers: {'Content-Type': 'application/json', 'Authorization': req.headers.authorization}
        };

        request(url, function (error, res2) {
            let productsRack = [];
            let products = JSON.parse(res2.body);
            products.forEach(function (product, i, products) {
                productsRack[i] = product;
            });
            res.send(productsRack);
        });
    });

    app.post('/add-storage', auth, function (req, res) {
        let nameStorage = req.body['name_storage'];
        var newStorage = new Storage({name: nameStorage, idRack: []});
        newStorage.save(function (err) {
            if (err) {
                res.render('error', {message: err.message});
                return;
            }
            res.redirect("http://127.0.0.1:4000/all-products")
        });
    });

    app.post('/add-rack', auth, function (req, res) {
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
                res.redirect("http://127.0.0.1:4000/all-products")
            });
        });
    });

    app.post('/delete-rack', auth, async function (req, res) {
        let idRack = req.body['rack_id'];
        let idStorage = req.body['storage_id'];
        await Storage.findOneAndUpdate({_id: idStorage}, function (err, storage) {
            let idRacks = storage.idRack;
            let index = idRacks.indexOf(idRack);
            idRacks.splice(index, 1);
            storage.save();
        });
        try {
            await Rack.deleteOne({_id: idRack});
            res.redirect("http://127.0.0.1:4000/all-products");
        } catch (err) {
            res.render('error', {message: err.message});
        }
    });

    app.post('/delete-storage',auth, function (req, res) {
        let idStorage = req.body['storage_id'];
        Storage.remove({_id: idStorage}, function (err) {
            if (err) {
                res.render('error', {message: err.message});
                console.log(err.message);
                return;
            }
            res.redirect("http://127.0.0.1:4000/all-products")
        });
    });

    app.post('/add-product', auth, function (req, res) {
        let idRack = req.body['rack_id'];
        let idStorage = req.body['storage_id'];
        let typeRack = req.body['type_rack'];
        const url = {
            uri: 'http://127.0.0.1:4000/products-names/' + typeRack,
            headers: {'Authorization': req.headers.authorization}
        };
        request(url,function(err, res2, body) {
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

    app.post('/rack/:id/add-old-product', auth, function (req, res) {
        let chbox = req.body;
        let idRack = req.params.id;
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
                res.redirect("http://127.0.0.1:4000/all-products")
            });
        })
    });

    app.post('/add-new-product', auth, function (req, res) {
        let article = req.body.article;
        let type = req.body.type;
        let name = req.body.name;
        let trademark = req.body.trademark;
        let idRack = req.body.idRack
        const url = {
            uri: 'http://127.0.0.1:3000/add-product-storage/',
            body: JSON.stringify({article: article, type: type, name: name, trademark: trademark}),
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': req.headers.Authorization}
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
                res.redirect("http://127.0.0.1:4000/all-products")
            });
        });
    });
};