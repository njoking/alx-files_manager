import { createClient } from "redis";
import { promisify } from "util";

/**
 * creates anew redis client and returns it
 * console log if there is an error
 * sets up error handling
 */
class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on("error", (error) => {
      console.log(`Redis client not connected to server: ${error}`);
    });
  }

  /**
   * checks if redis client is alive
   * returns true if redis client is alive
   * false if redis client is not alive(otherwise)
   */
  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  /**
   * retrieves value from redis client
   * @returns the val associated with the key
   * or null if key doesn't exist
   * (otherwise)
   */
  async get(key) {
    const redisGet = promisify(this.client.get).bind(this.client);
    const value = await redisGet(key);
    return value;
  }

  /**
   *
   * - key to be set in redis
   * value to be set
   *time in seconds after
   * which the key will expire
   */
  async set(key, value, time) {
    const redisSet = promisify(this.client.set).bind(this.client);
    await redisSet(key, value);
    await this.client.expire(key, time);
  }

  async del(key) {
    const redisDel = promisify(this.client.del).bind(this.client);
    await redisDel(key);
  }
}

// export redis client
// create redis client
const redisClient = new RedisClient();

module.exports = redisClient;
