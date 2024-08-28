import sha1 from "sha1";
import { ObjectID } from "mongodb";
import Queue from "bull";
import dbClient from "../utils/db";
import redisClient from "../utils/redis";

/**
 * user queue
 */
const userQueue = new Queue("userQueue");

// users controller
// initializes new user
class UsersController {
  static postNew(request, response) {
    const { email } = request.body;
    const { password } = request.body;

    if (!email) {
      response.status(400).json({ error: "Missing email" });
      return;
    }
    if (!password) {
      response.status(400).json({ error: "Missing password" });
      return;
    }

    const users = dbClient.db.collection("users");
    users.findOne({ email }, (err, user) => {
      if (user) {
        response.status(400).json({ error: "Already exist" });
      } else {
        const hashedPassword = sha1(password);
        users
          .insertOne({
            email,
            password: hashedPassword,
          })
          .then((result) => {
            response.status(201).json({ id: result.insertedId, email });
            userQueue.add({ userId: result.insertedId });
          })
          .catch((error) => console.log(error));
      }
    });
  }
  /**
   * gets current user
   * returns id and email
   */
  static async getMe(request, response) {
    const token = request.header("X-Token");
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const users = dbClient.db.collection("users");
      const idObjct = new ObjectID(userId);
      users.findOne({ _id: idObjct }, (err, user) => {
        if (user) {
          response.status(200).json({ id: userId, email: user.email });
        } else {
          response.status(401).json({ error: "Unauthorized" });
        }
      });
    } else {
      console.log("Hupatikani!");
      response.status(401).json({ error: "Unauthorized" });
    }
  }
}

// exports users controller
module.exports = UsersController;
