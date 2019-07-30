const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const MongoClient = require('mongodb').MongoClient;
const axios = require('axios');

const nodeMailerSMTPSettings = require('./secret').nodeMailerSettings;
const urlDb = require('./secret').urlDb;

const app = express();
const port = process.env.PORT || 5000;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// nodeMailer settings
let transporter = nodemailer.createTransport(nodeMailerSMTPSettings);

transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

// email sender using nodeMailer
const emailer = (emailAddress, btc, setValue, isPriceHigher) => {
    const mailIfPriceIsHigher = "<html>\n\
                        <body style='text-align: center'>\n\
                        <h2>Hi</h2>\n\
                        <h5>We would like to inform you that Bitcoin price is currently higher than what you set (" +  setValue + " $).</h5>\n\
                        <h3> Currently the price of Bitcoin is  " +  btc + " $.</h3>\n\
                        <p> We do not want to spam your inbox, therefore we will not sent you more notification. If you want to be notify again please use our app.</p>\n\
                       </body>\n\
                       </html>";
    const mailIfPriceIsBelow = "<html>\n\
                        <body style='text-align: center'>\n\
                        <h2>Hi</h2>\n\
                        <h5>We would like to inform you that Bitcoin price is currently below what you set (" +  setValue + " $).</h5>\n\
                        <h3> Currently the price of Bitcoin is  " +  btc + " $.</h3>\n\
                        <p> We do not want to spam your inbox, therefore we will not sent you more notification. If you want to be notify again please use our app.</p>\n\
                       </body>\n\
                       </html>";

    const sender_email = emailAddress;
    const htmlContent = isPriceHigher ? mailIfPriceIsHigher : mailIfPriceIsBelow;

    let mailOptions = {
        from: 'Crypto Notificator <username@domain.com>',
        to: sender_email,
        subject: "Bitcoin price changed",
        html: htmlContent
    };

    transporter.sendMail(mailOptions).then(console.log('messege sent'));
}

// API calls
app.get('/api/title', (req, res) => {
  res.send({ title: 'Bitcoin Notifier' });
});

// verify user's email address => save data(email, choosen price) to DB => inform user about successful request
app.post('/api/form', (req, res) => {
  console.log(req.body);
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (emailRegexp.test(req.body.emailAddress)) {
        db.collection('quotes').save(req.body, (err, result) => {
            if (err) return console.log(err);
            console.log('saved to database');
        })
        const messageForHigherPrice = req.body.priceIsHigherThan ? `We will inform you when the Bitcoin price will be higher than: ${req.body.priceIsHigherThan}.` : "";
        const messageForLowerPrice = req.body.priceIsLowerThan ? `We will inform you when the Bitcoin price will be below: ${req.body.priceIsLowerThan}.` : "";
        res.send(
            `We received your request. ${messageForHigherPrice} ${messageForLowerPrice} We will notify you on following email address: ${req.body.emailAddress}`,
        );
    }
});

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '/client/build', 'index.html'));
  });
}

setInterval(() => {getBtcPriceCompareAndNotify()}, 1000);

// get bitcoin price from btc exchange => get user's selected price from DB => compare prices and eventually notify user via emailer
const getBtcPriceCompareAndNotify = () => {
    axios.get('https://api.coindesk.com/v1/bpi/currentprice.json')
        .then(response => {
            const btcPrice = parseFloat(response.data.bpi.USD.rate.replace(",",""));
            db.collection('quotes').find().toArray()
                .then(response => {
                    response.forEach((element) => {
                        if (!element.wasNotifiedForHigh && btcPrice > element.priceIsHigherThan) {
                            emailer(element.emailAddress, btcPrice, element.priceIsHigherThan, true);
                            db.collection('quotes').updateMany({ emailAddress: element.emailAddress }, { $set: { wasNotifiedForHigh: true }});
                        }
                        if (!element.wasNotifiedForLow && btcPrice < element.priceIsLowerThan) {
                            emailer(element.emailAddress, btcPrice, element.priceIsLowerThan, false);
                            db.collection('quotes').updateMany({ emailAddress: element.emailAddress }, { $set: { wasNotifiedForLow: true }});
                        }
                    })
                })
                .catch(error => {console.log(error);});
        })
        .catch(error => {console.log(error);});
}


var db

MongoClient.connect(urlDb, (err, client) => {
    if (err) return console.log(err);
    db = client.db('crypto');
    app.listen(port, () => console.log(`Listening on port ${port}`));
})

