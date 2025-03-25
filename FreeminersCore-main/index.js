const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const PORT = 3000
const connectToDatabase = require('./Database/db')
const tokkenMiddleware = require('./Middlewares/tokenMiddlewares')
const rUser = require('./Routes/rUser')
const rAuth = require('./Routes/rAuth')
const rChart = require('./Routes/rChart')
const rTransaction = require('./Routes/rTransaction')
const rCommon = require('./Routes/rCommon')
const rBatch = require('./Routes/rBatch')
const rReports = require('./Routes/rReports')
const rConfig = require('./Routes/rConfig')
const UserMigration = require('./Migration/UserMigration')
const WalletMigration = require('./Migration/WalletMigration')
const ReportMigration = require('./Migration/ReportMigration')

app.use(cors());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin , X-Requested-With, Content-Type, Accept");
    next();
})

app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
}))

connectToDatabase.connectToDatabase()



app.listen(PORT, () => {
    console.log("Server started at port", PORT)
})

app.use(tokkenMiddleware)

app.use('/api/user', rUser)
app.use('/api/auth', rAuth)
app.use('/api/chart', rChart)
app.use('/api/transaction', rTransaction)
app.use('/api/common', rCommon)
app.use('/api/batch', rBatch)
app.use('/api/reports', rReports)
app.use('/api/config', rConfig)
app.use('/api/userMigration', UserMigration)
app.use('/api/walletMigration', WalletMigration)
app.use('/api/reportMigration', ReportMigration)