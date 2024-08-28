import Queue from "bull";
import imageThumbnail from "image-thumbnail";
import { promises as fs } from "fs";
import { ObjectID } from "mongodb";
import dbClient from "./utils/db";

// fileQueue - file processing queue
// userQueue - user processing queue
const fileQueue = new Queue("fileQueue");
const userQueue = new Queue("userQueue");

async function thumbNail(width, localPath) {
  const thumbnail = await imageThumbnail(localPath, { width });
  return thumbnail;
}

// worker.js
fileQueue.process(async (job, done) => {
  console.log("Processing...");
  const { fileId } = job.data;
  if (!fileId) {
    done(new Error("Missing fileId"));
  }

  const { userId } = job.data;
  if (!userId) {
    done(new Error("Missing userId"));
  }

  // check if file exists
  console.log(fileId, userId); // file id and user id
  const files = dbClient.db.collection("files");
  const idObjct = new ObjectID(fileId); // convert file id to ObjectId
  files.findOne({ _id: idObjct }, async (err, file) => {
    if (!file) {
      console.log("Not found");
      done(new Error("File not found"));
    } else {
      const flName = file.localPath;
      const thumbnail500 = await thumbNail(500, flName);
      const thumbnail250 = await thumbNail(250, flName);
      const thumbnail100 = await thumbNail(100, flName);

      console.log("Writing files to system");
      const image500 = `${file.localPath}_500`;
      const image250 = `${file.localPath}_250`;
      const image100 = `${file.localPath}_100`;

      await fs.writeFile(image500, thumbnail500);
      await fs.writeFile(image250, thumbnail250);
      await fs.writeFile(image100, thumbnail100);
      done();
    }
  });
});

// process user
// return welcome message
userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) done(new Error("Missing userId"));
  const users = dbClient.db.collection("users");
  const idObjct = new ObjectID(userId);
  const user = await users.findOne({ _id: idObjct });
  if (user) {
    console.log(`Welcome ${user.email}!`);
  } else {
    done(new Error("User not found"));
  }
});
