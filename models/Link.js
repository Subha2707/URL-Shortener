import mongoose from "mongoose";

const linkSchema = new mongoose.Schema({
    url:{
        type: String,
        required: true
    },
    shortcode:{
        type: String,
        required: true,
        unique: true
    },
    clicks:{
        type: Number,
        default: 0
    }
});

export default mongoose.model("Link",linkSchema);