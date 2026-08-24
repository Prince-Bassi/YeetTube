import mongoose from "mongoose";
import bcrypt from "bcrypt";

const user_schema = new mongoose.Schema({
	name: {type: String, required: true},
	email: {type: String, required: true, unique: true, index: true},
	password: {type: String, required: true},
	refresh_tokens: {type: [String], default: [], index: true}
});

user_schema.pre("save", async function(next) {
	if (!this.isModified("password")) return next();
	try {
		this.password = await bcrypt.hash(this.password, 10);
		next();
	}
	catch (err) {
		next(err);
	}
});

user_schema.methods.compare_password = async function(entered_password) {
	return await bcrypt.compare(entered_password, this.password);
}

const User = mongoose.model("User", user_schema);

export default User;