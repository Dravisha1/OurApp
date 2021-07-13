const mongoose = require('mongoose');

const userSchema =new mongoose.Schema({
    name : {
        type : String,
        required: true,
        unique : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String,
        required : true
    },
    confirmpassword : {
        type : String,
        required : true
    },
    followers : {
        type : [String],
        default : []
    },
    following : {
        type : [String],
        default : []
    }, 
    online : {
        type : Boolean,
        default : false
    }
});

const User = new mongoose.model('User' ,userSchema);

module.exports = User;