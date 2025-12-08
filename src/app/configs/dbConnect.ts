const mongoose = require("mongoose");

const dbConnect = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("db url missing");
    }
    const connect = await mongoose.connect(process.env.MONGODB_URL);
    if (connect) {
      console.log("db connect successfully");
    }
  } catch (error) {
    console.log("db connect failed", error);
  }
};
module.exports = dbConnect;
