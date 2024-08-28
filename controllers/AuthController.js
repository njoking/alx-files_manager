import sha1 from "sha1";
import { v4 as uuidv4 } from "uuid";
import dbClient from "../utils/db";
import redisClient from "../utils/redis";

/**
 * auth controller class
 * handles auth requests
 * creates and returns auth tokens
 */
class AuthController {
  static async getConnect(request, response) {
    const authdtAuth = request.header("Authorization");
    let usrEmail = authdtAuth.split(" ")[1];
    const buffr = Buffer.from(usrEmail, "base64");
    usrEmail = buffr.toString("ascii");
    /**
     * data = [email, password]
     * data.length = 2
     */
    const credentialArr = usrEmail.split(":");
    if (credentialArr.length !== 2) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }
    const hashedPassword = sha1(credentialArr[1]);
    const users = dbClient.db.collection("users");
    users.findOne(
      { email: credentialArr[0], password: hashedPassword },
      async (err, user) => {
        if (user) {
          const token = uuidv4();
          const key = `auth_${token}`;
          await redisClient.set(key, user._id.toString(), 60 * 60 * 24);
          response.status(200).json({ token });
        } else {
          response.status(401).json({ error: "Unauthorized" });
        }
      }
    );
  }

  // TODO
  static async getDisconnect(request, response) {
    const token = request.header("X-Token");
    const key = `auth_${token}`;
    const id = await redisClient.get(key);
    if (id) {
      await redisClient.del(key);
      response.status(204).json({});
    } else {
      response.status(401).json({ error: "Unauthorized" });
    }
  }
}

module.exports = AuthController;
