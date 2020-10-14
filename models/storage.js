var mongoose = require('../libs/mongoose'),
    Schema = mongoose.Schema;

var schema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    idRack: Array

},{collection: 'storages'});

exports.Storage = mongoose.model('Storage', schema);