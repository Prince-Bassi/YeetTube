import express from "express";
import User from "./models/User.js";
import Video from "./models/Video.js";
import {auth_middleware} from "./auth.js";
import multer from "multer";
import mongoose from "mongoose";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import path from "path";
import { spawn } from "child_process";

const hash = (value) => {
	return crypto.createHash("sha256").update(value).digest("hex");
};

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		req.mime_type = file.mimetype;

		const dir = `./video_uploads/${req.idHash.slice(0,2)}/${req.idHash.slice(2, 4)}`;
        req.videoDir = dir;
		fs.mkdirSync(dir, {recursive: true});

		cb(null, dir);
	},
	filename: (req, file, cb) => {
        if (file.fieldname === "thumbnail") {
            cb(null, `${req.video_id}.tmp`);
        }
        else {
            cb(null, req.video_id);
        }
	}
});

const upload = multer({ storage });

const video_router = express.Router();

const generateVideoId = async (req, res, next) => {
    const video_id = new mongoose.Types.ObjectId().toString();	
	req.video_id = video_id;
    req.idHash = hash(video_id);
    next();
};

video_router.post("/upload_video", auth_middleware, generateVideoId, upload.fields([{name: "video", maxCount: 1}, {name: "thumbnail", maxCount: 1}]), async (req, res, next) => {
	const {video_title, video_desc} = JSON.parse(req.body.data);
	
	if (!(video_title && video_desc)) return res.status(400).json({success: false, message: "Insufficient data"});

	try {
		const video = new Video({
			_id: req.video_id,
			user_id: req.userId,
			mime_type: req.mime_type,
			video_title,
			video_desc
		});

		await video.save();

        if (fs.existsSync(`${req.videoDir}/${req.video_id}.tmp`)) {
            await sharp(`${req.videoDir}/${req.video_id}.tmp`)
                .jpeg()
                .toFile(`${req.videoDir}/${req.video_id}.jpeg`);

            fs.unlinkSync(`${req.videoDir}/${req.video_id}.tmp`);
        }

        const ffmpeg = spawn("ffmpeg", [
            "-i", `${req.videoDir}/${req.video_id}`,
            "-ss", "00:00:05",
            "-frames:v", "1",
            `${req.videoDir}/${req.video_id}-default.jpeg`
        ]);

		res.status(200).json({success: true, message: "Video Uploaded"});
	}
	catch (err) {
		next(err);
	}
});

const CHUNK_SIZE = 1024 * 120;

video_router.get("/video/:id", async (req, res, next) => {
	const video_id = req.params.id;
	if (!video_id) return res.status(400).send("Video Id not found");

	const video = await Video.findOne({_id: video_id});
	if (!video) return res.status(404).send("Video not found");

	try {
		const id_hash = hash(video_id);

		const file_path = `./video_uploads/${id_hash.slice(0,2)}/${id_hash.slice(2, 4)}/${video_id}`;
		const stats = fs.statSync(file_path);

		const size = stats.size;
		const range = req.headers.range;
		if (!range) return res.status(416).send("Range headers not found");

		const parts = range.replace(/bytes=/, "").split("-");
		const start = parts[0] ? parseInt(parts[0], 10) : 0;
		const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, size - 1);

		const file = fs.createReadStream(file_path, {start, end});
		res.writeHead(206, {
			"Content-Range": `bytes ${start}-${end}/${size}`,
			"Accept-Ranges": "bytes",
			"Content-Length": end - start + 1,
			"Content-Type": video.mime_type
		});

		file.pipe(res);
	}
	catch (err) {
		next(err);
	}
});

const recentViews = new Map();
video_router.post("/video/:videoId/view", async (req, res, next) => {
    const videoId = req.params.videoId;
    if (!videoId) return res.status(400).json({ success: false, message: "Video id not found" });

    try {
        const key = `${req.ip}:${videoId}`;
        if (recentViews.has(key)) return res.status(403).json({ success: false, message: "No" });
        
        const result = await Video.updateOne({ _id: videoId }, { $inc: { views: 1 } });

        if (result.matchedCount === 0) {
            return res.status(400).json({ success: false, message: "No video found" });
        }
        else {
            recentViews.set(key, true);

            setTimeout(() => {
                recentViews.delete(key);
            }, 1000 * 60);

            return res.status(200).json({ success: true, message: "View incremented" });
        }
    }
    catch (err) {
        next(err);
    }
});

video_router.get("/fetch_video_data/:video_id", async (req, res, next) => {
	const video_id = req.params.video_id;
	if (!video_id) return res.status(400).json({success: false, message: "Video id not found"});

	const video = await Video.findOne({_id: video_id});
	if (!video) return res.status(500).json({success: false, message: "Video not found"});

	try {
		const user = await User.findOne({_id: video.user_id});
		const video_data = {
			uploaded_by: user.name,
			video_title: video.video_title,
			video_desc: video.video_desc,
			likes: video.likes,
			dislikes: video.dislikes
		};

		res.status(200).json({success: true, message: "Video metadata received", video_data});
	}
	catch (err) {
		next(err);
	}
});

video_router.get("/thumbnail/:videoId", async (req, res, next) => {
    try {
        const videoId = req.params.videoId;
        const idHash = hash(videoId);
        const dir = `./video_uploads/${idHash.slice(0, 2)}/${idHash.slice(2, 4)}`;
        const thumbnail = `${dir}/${videoId}.jpeg`;
        const defaultThumbnail = `${dir}/${videoId}-default.jpeg`;

        if (fs.existsSync(thumbnail)) {
            return res.sendFile(path.resolve(thumbnail));
        }

        return res.sendFile(path.resolve(defaultThumbnail));
    }
    catch (err) {
        next(err);
    }
});

video_router.get("/fetch_recommended", async (req, res, next) => {
	try {
		const videos = await Video.find().sort({ createdAt: -1 }).limit(9);
		res.status(200).json({success: true, message: "Videos fecthed", videos});
	}
	catch (err) {
		next(err);
	}
});

export default video_router;
 