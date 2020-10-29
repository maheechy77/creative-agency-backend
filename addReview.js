import mongoose from "mongoose";

const addReviewModel = mongoose.Schema({
	name: String,
	imgName: String,
	designation: String,
	description: String,
});

export default mongoose.model("reviews", addReviewModel);
