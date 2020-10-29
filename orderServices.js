import mongoose from "mongoose";

const orderServiceModel = mongoose.Schema({
	uid: String,
	email: String,
	name: String,
	title: String,
	imgName: String,
	description: String,
	price: String,
	status: {
		type: String,
		enum: ["pending", "ongoing", "done"],
	},
});

export default mongoose.model("orders", orderServiceModel);
