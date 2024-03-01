const nodemailer = require('nodemailer')

//SETUP NODEMAILER
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'syedshamsher9174@gmail.com',
        pass: 'SYED@shamsher14'
    }
})

module.exports = transporter