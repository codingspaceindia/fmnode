const mAddress = require("../Models/mAddress")

exports.createOrUpdateAddress = async (details, session) => {
    try {
        if (details._id) {
            let updateAddress = await mAddress.findByIdAndUpdate({ _id: details._id }, details, { session });
            return updateAddress._id
        } else {
            let newAddress = await new mAddress(details).save({ session })
            return newAddress._id
        }
    } catch (err) {
        console.log(err)
        return err
    }
}