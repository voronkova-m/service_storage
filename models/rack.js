var mongoose = require('../libs/mongoose'),
    Schema = mongoose.Schema;

var schema = new Schema({
    type: {
        type: String,
        required: true
    },
    products: [
        {
            idProduct: mongoose.Schema.Types.ObjectId,
            countProduct: {
                type: Number,
            }
        }
    ]
}, {collection: 'raking'});

exports.Rack = mongoose.model('Rack', schema);