const nodemailer = require("nodemailer");
const mOTP = require("../Models/mOTP");

// Generate a random OTP
function generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

// Send OTP email
exports.sendOtpEmail = async (details, subject = "Your OTP Code") => {
    // Generate an OTP
    const otp = generateOTP();

    // Create a transporter object
    const transporter = nodemailer.createTransport({
        host: "mail.assetfmdc.com",
        port: 465,
        secure: true,
        auth: {
            user: "fm@assetfmdc.com", // Your email
            pass: "Admin@123", // Your email password or app password
        },
        logger: true,
        debug: true, //
    });

    // Email details
    const mailOptions = {
        from: '"FreeMiners" fm@assetfmdc.com', // Sender address
        to: details.recipientEmail, // Recipient's email
        subject: subject, // Email subject
        text: `Your OTP code is: ${otp}`, // Plain text body
        html: `<p>Your OTP code is: <b>${otp}</b></p>`, // HTML body
    };

    try {
        // Send the email
        details.otp = otp
        await transporter.sendMail(mailOptions);
        const existedOTP = await mOTP.find({ refId: details.refId, activeStat: "A" }, {}, {});
        if (existedOTP.length > 0) {
            existedOTP.map(async (c) => {
                c.activeStat = 'D'
                await mOTP.findOneAndUpdate({ _id: c._id }, c, {})
            })
        }
        await new mOTP(details).save()
        return { success: true }; // Return OTP for verification
    } catch (error) {
        console.error(`Error sending email: ${error}`);
        return { success: false, error };
    }
}

exports.sendRegisterEmail = async (details, subject = "Welcome To Freeminers") => {
    const transporter = nodemailer.createTransport({
        host: "mail.assetfmdc.com",
        port: 465,
        secure: true,
        auth: {
            user: "fm@assetfmdc.com", // Your email
            pass: "Admin@123", // Your email password or app password
        },
        logger: true,
        debug: true, //
    });

    // Email details
    const mailOptions = {
        from: '"FreeMiners" fm@assetfmdc.com', // Sender address
        to: details.recipientEmail, // Recipient's email
        subject: subject, // Email subject
        text: `Welcome To`, // Plain text body
        html: `<p>Welcome to <b>Freeminers</b>, where innovation meets opportunity! 🎉
<br/>
We’re thrilled to have you join our growing community of crypto enthusiasts and visionaries. 
<br/>
<br/>
1.Login To Your Account.
<br/>
<br/>
2.Explore your dashboard and set up your profile.
<br/>
<br/>
3.Start building your network and watch your crypto journey flourish!
<br/>
<br/>
Here is your account details : <br/>
Username : <b>${details.userName}</b>
<br/>
Password : <b>${details.password}</b>
<br/>
Link : <b>https://freeminers.org</b>
<br/>
<br/>
Thank you for choosing Freeminers to embark on this exciting journey. Let’s achieve greatness together!

<br/>
Warm regards,
<br/>
Freeminers</p>`, // HTML body
    };

    try {
        // Send the email
        // details.otp = otp
        const info = await transporter.sendMail(mailOptions);
        // const existedOTP = await mOTP.findOne({ refId: details.refId, activeStat: "A" }, {}, {});
        // if (existedOTP) {
        //     existedOTP.activeStat = 'D'
        //     await mOTP.findOneAndUpdate({ _id: existedOTP._id }, existedOTP, {})
        // }
        // await new mOTP(details).save()
        return { success: true }; // Return OTP for verification
    } catch (error) {
        console.error(`Error sending email: ${error}`);
        return { success: false, error };
    }
}

// Example usage
// (async () => {
//     const email = "recipient@example.com";
//     const result = await sendOtpEmail(email);
//     if (result.success) {
//         console.log(`OTP sent successfully: ${result.otp}`);
//     } else {
//         console.error("Failed to send OTP:", result.error);
//     }
// })();