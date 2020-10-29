import mongoose from "mongoose";

const userStatusSchema = mongoose.Schema({
	uid: String,
	email: String,
	isAdmin: Boolean,
});

export default mongoose.model("userStatuses", userStatusSchema);
