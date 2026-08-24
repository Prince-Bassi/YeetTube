import express from "express";
import User from "./models/User.js";
import jsonwebtoken from "jsonwebtoken";
import axios from "axios";
import bcrypt from "bcrypt";

const auth_router = express.Router();

async function validate_email(email) {
       const url = `http://apilayer.net/api/check?access_key=${process.env.MAILBOX_LAYER_API_KEY}&email=${email}&smtp=1&format=1`;
       const response = await axios.get(url);
       return response.data?.success !== false;
}

auth_router.post("/register", async (req, res, next) => {
	const {name, email, password} = req.body;
	if (!(name && email && password)) return res.status(400).json({success: false, message: "Incomplete data"});

	try {
		const user_exists = await User.findOne({email});
		if (user_exists) return res.status(403).json({success: false, message: "User already exists"});

		const user = new User({name, email, password});
		await user.save();

		res.status(200).json({success: true, message: "User added successfully"});
	}
	catch (err) {
		console.error(err);
		res.status(500).json({success: false, message: "Failed to add user"});
	}
});

const generate_tokens = (user) => {
	const access_token = jsonwebtoken.sign({id: user._id}, process.env.JWT_ACCESS_KEY, {expiresIn: "1h"});
	const refresh_token = jsonwebtoken.sign({id: user._id}, process.env.JWT_REFRESH_KEY, {expiresIn: "7d"});

	return {access_token, refresh_token};
}

auth_router.post("/login", async (req, res, next) => {
	const {email, password} = req.body;
	if (!(email && password)) return res.status(400).json({success: false, message: "Incomplete data"});

	try {
		const user = await User.findOne({email});
		if (!user) return res.status(400).json({success: false, message: "No such user found"});

		const valid_password = await user.compare_password(password);
		if (!valid_password) {
			return res.status(403).json({success: false, message: "Incorrect password"});
		}

		const {access_token, refresh_token} = generate_tokens(user);
		res.cookie("refresh_token", refresh_token, {
			httpOnly: true,
			secure: false,
			sameSite: "Strict",
			maxAge: 7 * 24 * 60 * 60 * 1000
		});

		await User.updateOne(
			{ _id: user._id },
			{ $addToSet: { refresh_tokens: refresh_token } }
		);

		await User.updateOne(
			{ _id: user._id },
			{ $push: { refresh_tokens: { $each: [], $slice: -10 } } }
		);

		res.status(200).json({success: true, message: `Logged in as ${user.name}`, access_token});
	}
	catch (err) {
		console.error(err);
		res.status(500).json({success: false, message: "Failed login"});
	}
});

auth_router.post("/logout", async (req, res, next) => {
	try {
		const cookies = req.headers.cookie
            	? Object.fromEntries(req.headers.cookie.split("; ").map(c => c.split('=')))
            	: {};
        	const token = cookies?.refresh_token;
		res.clearCookie("refresh_token", {
			httpOnly: true,
			secure: false,
			sameSite: "Strict"
		});
		await User.updateOne({refresh_tokens: token}, {$pull: {refresh_tokens: token}});
		res.status(200).json({success: true, message: "Logged out"});
	}
	catch (err) {
		console.error(err);
		res.status(500).json({success: false, message: "Failed to log out."});
	}
});

const auth_middleware = (req, res, next) => {
	const token = req.header("Authorization");
	if (!token) return res.status(403).json({success: false, message: "Access denied"});

	try {
		const decoded = jsonwebtoken.verify(token.replace("Bearer ", ""), process.env.JWT_ACCESS_KEY);
		req.userId = decoded.id;
		next();
	}
	catch (err) {
		res.status(403).json({success: false, message: "Invalid token"});
	}
};

auth_router.post("/refresh_token", async (req, res, next) => {
	const cookies = req.headers.cookie
    	? Object.fromEntries(req.headers.cookie.split("; ").map(c => c.split('=')))
    	: {};
	const token = cookies?.refresh_token;

	if (!token) return res.status(200).json({success: false, message: "No refresh token"});

	try {
		const user = await User.findOne({ refresh_tokens: { $elemMatch: { $eq: token } } } );
		if (!user) return res.status(403).json({success: false, message: "No user found"});

		const decoded = jsonwebtoken.verify(token, process.env.JWT_REFRESH_KEY);
		if (user.id !== decoded.id) return res.status(403).json({success: false, message: "User mismatch"});

		const {access_token, refresh_token} = generate_tokens(user);
		res.cookie("refresh_token", refresh_token, {
			httpOnly: true,
			secure: false,
			sameSite: "Strict",
			maxAge: 7 * 24 * 60 * 60 * 1000
		});

		await User.updateOne(
			{ _id: user._id },
			{ $addToSet: { refresh_tokens: refresh_token } }
		);

		await User.updateOne(
			{ _id: user._id },
			{ $push: { refresh_tokens: { $each: [], $slice: -10 } } }
		);

		res.status(200).json({success: true, message: `Logged in as ${user.name}`, access_token});
	}
	catch (err) {
		console.error(err);
		res.status(500).json({success: false, message: "An error occurred"});
	}
});

export {auth_router, auth_middleware};
