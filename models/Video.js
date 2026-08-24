import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
	user_id: {type: mongoose.Types.ObjectId, required: true},
	video_title: {type: String, required: true},
	video_desc: {type: String},
	mime_type: {type: String},
	likes: {type: Number, default: 0},
	dislikes: {type: Number, default: 0},
	views: {type: Number, default: 0},
});

const Video = mongoose.model("Video", videoSchema);
export default Video;