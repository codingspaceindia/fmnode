const async = require("async");
const jwt = require("jsonwebtoken");
const jwtKey = "FREEMINERS+CODINGSPACE";
const exceptionList = [
    //Auth List
    "/api/auth/login",
    "/api/auth/forgotPassword",
    //User List
    "/api/user/createUser",
    "/api/common/updateCoinValue",
    "/api/config/getMaintanenceReport",
    "/api/userMigration/migrateUser",
    "/api/userMigration/insertNodes",
    "/api/userMigration/migrateFreeCoin",
    "/api/walletMigration/migrateOfferWallet",
    "/api/walletMigration/migrateEarningWallet",
    "/api/walletMigration/migrateStakingWallet",
    "/api/walletMigration/migrateTransferWallet",
    "/api/walletMigration/migrateTotalWallet",
    "/api/walletMigration/migrateBalance",
    "/api/reportMigration/stakingReporMigration",
    "/api/reportMigration/withdrawReportMigration",
    "/api/userMigration/migrateActiveUsers",
    "/api/walletMigration/migrateUpdateBalance",
    "/api/batch/runDailyBonus",
    "/api/batch/runRos",
    "/api/batch/runPairMatch",
    "/api/common/verifyOTP",
    "/api/common/requestNewOTP",
    "/api/auth/resetPassword"
];
module.exports = function verifyToken(req, res, next) {
    if (exceptionList.includes(req.path)) {
        return next();
    } else {
        if (!req.headers.authorization) {
            return res.status(401).send("unauthorized");
        }
        const token = req.headers.authorization.split(" ")[1];
        if (token === null) {
            return res.status(401).send("unauthorized");
        }

        let payload;
        async.series({
            checkToken: (callback) => {
                jwt.verify(token, jwtKey, (err, verifyDocs) => {
                    if (err && err.name) {
                        return callback({ code: "EXPRY", name: err.name });
                    } else {
                        payload = verifyDocs;
                        return callback();
                    }
                });
            },
            handleToken: (callback) => {
                if (!payload) {
                    return callback({ code: 401 });
                } else {
                    return callback();
                }
            },
        }, (err) => {
            if (err) {
                if (err.code === 401) {
                    return res.status(401).send("unauthorized");
                } else if (err.code === "EXPRY") {
                    let code;
                    if (err.name == "TokenExpiredError") {
                        code = "Session expired.Login again";
                    } else {
                        code = err.name;
                    }
                    return res.status(401).send({ code: code, isLogout: true });
                }
            } else {
                req.body["token"] = payload;
                delete req.body["token"]["iat"];
                delete req.body["token"]["exp"];
                return next();
            }
        });
    }
};
