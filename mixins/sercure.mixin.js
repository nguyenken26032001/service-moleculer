"use strict"
const jwt = require('jsonwebtoken');
module.exports ={
    methods:{
        generateToken(user){
           return jwt.sign(user,process.env.JWT_TOKEN,{expiresIn:'3days'})
        },
        verifyToken(token){
           if(!token){
            throw "TOKEN IS EMPTY";
           }else{
            const user = jwt.verify(token,process.env.JWT_TOKEN);
            return user
           }
        }
    }
}