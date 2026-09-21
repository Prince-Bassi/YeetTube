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

const generateThumbnail = async (req) => {
    let defaultPath;
    let thumbnailPath = `${req.videoDir}/${req.video_id}.tmp`;
    const thumbnailExists = fs.existsSync(thumbnailPath);

    if (thumbnailExists) {
        const newPath = `${req.videoDir}/${req.video_id}.jpeg`;
        await sharp(thumbnailPath)
            .jpeg()
            .toFile(newPath);

        fs.unlinkSync(thumbnailPath);
        thumbnailPath = newPath;
    }

    defaultPath = `${req.videoDir}/${req.video_id}-default.jpeg`;
    await new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-i", `${req.videoDir}/${req.video_id}`,
            "-ss", "00:00:05",
            "-frames:v", "1",
            defaultPath
        ]);

        ffmpeg.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}`));
        });

        ffmpeg.on("error", reject);
    });

    const metadata = await sharp(defaultPath).metadata();
    const is16By9 = Math.abs(metadata.width / metadata.height - 16 / 9) < 0.01;

    const resizeThumbnail = async (path) => {
        const {data, info} = await sharp(path)
            .resize(50, 50)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const colors = new Map();
        
        for (let i = 0; i < data.length; i += 3) {
            const r = Math.floor(data[i] / 16) * 16;
            const g = Math.floor(data[i + 1] / 16) * 16;
            const b = Math.floor(data[i + 2] / 16) * 16;

            const key = `${r},${g},${b}`;
            colors.set(key, (colors.get(key) || 0) + 1);
        }
        
        const sortedColors = [...colors.entries()]
            .sort((a, b) => b[1] - a[1]);

        let mostCommon = sortedColors[0];
        for (let color of sortedColors) {
            const splitColor = color[0].split(",");

            if (!(splitColor[0] == splitColor[1] && splitColor[1] == splitColor[2])) {
                mostCommon = color;
                break;
            }
        }

        mostCommon = mostCommon[0].split(",");
           
        const bg = sharp({
            create: {
                width: 1280,
                height: 720,
                channels: 3,
                background: { r: mostCommon[0], g: mostCommon[1], b: mostCommon[2] }
            }
        });

        const scale = Math.min(
            1280 / metadata.width,
            720 / metadata.height
        );

        const width = Math.round(metadata.width * scale);
        const height = Math.round(metadata.height * scale);

        const thumbnail = await sharp(path)
            .resize(width, height, {
                fit: "contain"
            })
            .toBuffer();

        await bg
            .composite([
                {
                    input: thumbnail,
                    gravity: "center"
                }
            ])
            .jpeg()
            .toFile(path);
    };

    if (!is16By9) {
        await resizeThumbnail(defaultPath); 
        if (thumbnailExists) await resizeThumbnail(thumbnailPath);
    }
}

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
        await generateThumbnail(req);

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
 