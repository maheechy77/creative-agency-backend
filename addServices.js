import mongoose from "mongoose";

const addServiceModel = mongoose.Schema({
	title: String,
	imgName: String,
	description: String,
});

export default mongoose.model("services", addServiceModel);
