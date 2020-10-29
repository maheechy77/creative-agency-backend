import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import Grid from "gridfs-stream";
import GridFsStorage from "multer-gridfs-storage";
import path from "path";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { key } from "./firebaseKey.js";

import userStatusSchema from "./userStatus.js";
import addServicesSchema from "./addServices.js";
import orderServicesSchema from "./orderServices.js";
import addReviewSchema from "./addReview.js";

Grid.mongo = mongoose.mongo;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
dotenv.config();
const port = process.env.PORT || 9000;

admin.initializeApp({
	credential: admin.credential.cert(key),
	databaseURL: "https://creative-agency-5ac28.firebaseio.com",
});

const mongoURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.z18fq.mongodb.net/creativeagency?retryWrites=true&w=majority`;
const conn = mongoose.createConnection(mongoURI, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
});
mongoose.connect(mongoURI, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
});

let gfs;

conn.once("open", () => {
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection("images");
});

const storage = new GridFsStorage({
	url: mongoURI,
	file: (req, file) => {
		return new Promise((resolve, reject) => {
			const filename = `image-${Date.now()}${path.extname(file.originalname)}`;
			const fileinfo = {
				filename,
				bucketName: "images",
			};
			resolve(fileinfo);
		});
	},
});

const upload = multer({ storage });

app.patch("/update/user", async (req, res) => {
	const newAdmin = req.body;

	await userStatusSchema
		.findOneAndUpdate(
			{ email: newAdmin.email },
			{ $set: { isAdmin: true } },
			(err, data) => {
				if (err) {
					res.status(500).send(err);
				} else {
					res.status(201).send(data);
				}
			}
		)
		.catch((err) => console.log(err.mesage));
});

app.patch("/update/servicestatus", async (req, res) => {
	const newStatus = req.body;

	await orderServicesSchema
		.findOneAndUpdate(
			{ name: newStatus.username, title: newStatus.title },
			{ $set: { status: newStatus.value } },
			(err, data) => {
				if (err) {
					res.status(500).send(err);
				} else {
					res.status(201).send(data);
				}
			}
		)
		.catch((err) => console.log(err.mesage));
});

app.post("/add/user", (req, res) => {
	const newUser = req.body;

	userStatusSchema.find({ email: newUser.email }, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			if (data.length > 0) {
				res.status(201).send("Hello User");
			} else {
				userStatusSchema.create(newUser, (err, data) => {
					if (err) {
						res.status(500).send(err);
					} else {
						res.status(201).send(data);
					}
				});
			}
		}
	});
});

app.get("/get/:userEmail", (req, res) => {
	const getUserEmail = req.params.userEmail;
	userStatusSchema.find({ email: getUserEmail }, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.post("/upload/image", upload.single("file"), (req, res) =>
	res.status(201).send(req.file)
);

app.post("/add/services", (req, res) => {
	const dbPost = req.body;
	addServicesSchema.create(dbPost, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.post("/add/reviews", (req, res) => {
	const dbPost = req.body;
	addReviewSchema.create(dbPost, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.post("/order/services", (req, res) => {
	const dbPost = req.body;
	orderServicesSchema.create(dbPost, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.get("/retrive/services", (req, res) => {
	addServicesSchema.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			data.sort((b, a) => {
				return a.timestamp - b.timestamp;
			});
			res.status(201).send(data);
		}
	});
});

app.get("/retrive/reviews", (req, res) => {
	addReviewSchema.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			data.sort((b, a) => {
				return a.timestamp - b.timestamp;
			});
			res.status(201).send(data);
		}
	});
});

app.get("/images/single", (req, res) => {
	gfs.files.findOne({ filename: req.query.name }, (err, file) => {
		if (err) {
			res.status(500).send(err);
		} else {
			if (!file || file.length === 0) {
				res.status(404).json({ err: "File not found!" });
			} else {
				const readStream = gfs.createReadStream(file.filename);
				readStream.pipe(res);
			}
		}
	});
});

app.get("/get/userServiceList/:userId", (req, res) => {
	const userId = req.params.userId;
	const token = req.headers.authorization;
	console.log(userId, token);
	if (token && token.startsWith("Bearer ")) {
		const idToken = token.split(" ")[1];
		admin
			.auth()
			.verifyIdToken(idToken)
			.then(function (decodedToken) {
				let uid = decodedToken.uid;
				console.log(uid);
				if (uid === userId) {
					console.log("done 1");
					orderServicesSchema.find({ uid: userId }, (err, data) => {
						if (err) {
							res.status(500).send(err);
						} else {
							console.log("done 2");
							let services = [];
							data.map((serviceData) => {
								const serviceInfo = {
									title: serviceData.title,
									photoURL: serviceData.imgName,
									description: serviceData.description,
									status: serviceData.status,
								};
								services.push(serviceInfo);
								console.log("done 3");
							});
							res.status(200).send(services);
							console.log("done 4");
						}
					});
				}
			})
			.catch(function (error) {
				console.log(error);
			});
	}
});

app.get("/allUserServiceList", (req, res) => {
	orderServicesSchema.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			let services = [];
			data.map((serviceData) => {
				const enumValues = orderServicesSchema.schema.path("status").enumValues;
				const serviceInfo = {
					username: serviceData.name,
					email: serviceData.email,
					description: serviceData.description,
					title: serviceData.title,
					status: serviceData.status,
					enums: enumValues,
				};
				services.push(serviceInfo);
			});
			res.status(200).send(services);
		}
	});
});

app.get("/", (req, res) => {
	res.status(200).send("hello");
});

app.listen(port);
