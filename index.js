const express = require('express')
const bodyParser = require('body-parser')
const connectDB = require('./dbconfig')
const transporter = require('./nodemailer')
const jwt = require('jsonwebtoken')
const User = require('./model')

const app = express()
const PORT = process.env.PORT || 3000;

//Database connection
connectDB()

//body parser middleware
app.use(bodyParser.json())

//middleware to check if the request has a valid JWT (authentication token)
const authenticationToken = (req, res, next) => {
    const token = req.headers.Authorization
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    console.log(token)
    jwt.verify(token, '', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' })
        req.user = user
        next()
    })
}

app.get('/', async (req, res) => {
    res.json({ message: `application successful` })
})

//signup endpoint
app.post('/api/signup', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body
    try {
        if( password !== confirmPassword ){
            return res.status(400).json({ error: 'kindy check the password again!' })
        }
        const user = new User({ name, email, password })
        await user.save()
        res.json({ message: 'User registered successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.findOne({ email })
        if(!user){
            return res.status(404).json({error: 'User not found'})
        }
        const isMatch = await user.comparePassword(password)
        if(!isMatch){
            return res.status(401).json({ error: 'Invalid credentials' })
        }
        const token = jwt.sign({ email: user.email } , 'userauthenticationbyjwt', { expiresIn: '1h' })
        res.json({token})
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//Api endpoint for sending reset password email
app.post('/api/reset-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        //Generate and store reset token
        const resetToken = jwt.sign({ email }, 'userauthenticatelogin', { expiresIn: '1h' });
        user.resetToken = resetToken;
        user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour
        await user.save();

        //sent reset password email
        const mailOptions = {
            from: 'syedShamsher9174@gmail.com',
            to: email,
            subject: 'Password Reset',
            text: `Click the following link to reset your password: https://user-authentication-zma9.onrender.com/reset-password/${resetToken}`
        }

        await transporter.sendMail(mailOptions)

        res.json({ message: 'Reset password email sent successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//api endpint to resetting password
app.post('/api/reset-password/:token', authenticationToken, async (req, res) => {
    const { newPassword } = req.body;
    const { email } = req.user;
    try {
        //check if the user exists
        const user = await User.findOne({ email })

        if(!user){
            return res.status(404).json({ error: 'User not found' })
        }

        //verify the token and expiration time
        if(user.resetToken !== req.params.token || Date.now() > user.resetTokenExpiration){
          return res.status(400).json({ error: 'Invalid or expired token' })  
        }

        //update password and clear reset token
        user.password = newPassword;
        user.resetToken = undefined;
        user.resetTokenExpiration = undefined;
        await user.save()

        res.json({ message: 'Password reset successful' })
    } catch (error) {
        console.error(error)
    }
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})