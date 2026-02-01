const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "userType"
    },
    userType: {
        type: String,
        enum: ["User", "Student"],
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    device: {
        type: String, // android / ios / web
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revoked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
