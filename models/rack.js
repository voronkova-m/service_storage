var mongoose = require('../libs/mongoose'),
    Schema = mongoose.Schema;

var schema = new Schema({
    type: {
        type: String,
        required: true
    },
    idProducts: {
        type: Array
    },
    countProducts: {
        type: Array
    }
},{collection: 'raking'});

exports.Rack = mongoose.model('Rack', schema);