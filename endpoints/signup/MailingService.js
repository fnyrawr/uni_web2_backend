const config = require("config")
const nodemailer = require("nodemailer")
const logger = require("../../config/winston")

/*
    Nodemailer/Verifying source:
    https://betterprogramming.pub/how-to-create-a-signup-confirmation-email-with-node-js-c2fea602872a
    https://nodemailer.com/about/
    https://mailtrap.io/blog/sending-emails-with-nodemailer/
 */

// methods for confirmation process
const emailTransport = nodemailer.createTransport({
    host: config.get("mailConfig.host"),
    port: config.get("mailConfig.port"),
    auth: {
        user: config.get("mailConfig.user"),
        pass: config.get("mailConfig.pass")
    }
})

function sendConfirmationEmail(user, email, confirmationToken) {
    logger.debug("sending confirmation email to user " + user + " with email " + email + "\n confirmationCode: " + confirmationToken)
    emailTransport.sendMail({
        from: '"WE2 Communitypage Mailservice" <"spam@me.net">',
        to: user + "<" + email + ">",
        subject: "Please confirm your account on WE2-Project",
        html: `<h2>Hi ${user}</h2><br><p>Thanks for your registration. Please confirm your mail by clicking <a href=http://localhost:8080/signup/confirm/${confirmationToken}>here</a></p>`
    }, function(err, url) {
        if (err) {
            logger.error("Error while trying to send confirmation mail: " + err)
        }
        logger.info('Sending of confirmation mail to user ' + user + ' succeeded')
    })
}

module.exports = {
    sendConfirmationEmail
}