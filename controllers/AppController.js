import redisClient from "../utils/redis";
import dbClient from "../utils/db";

/**
 * app controller class
 * initializes redis and db clients
 */
class AppController {
  static getStatus(request, response) {
    response
      .status(200)
      .json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(request, response) {
    const usrTtlNo = await dbClient.nbUsers();
    const flTtlNo = await dbClient.nbFiles();
    response.status(200).json({ users: usrTtlNo, files: flTtlNo });
  }
}

// export app controller
module.exports = AppController;
