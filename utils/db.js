import { MongoClient } from "mongodb";

/**
 * MongoDB client wrapper
 * returns db client
 */
const HOST = process.env.DB_HOST || "localhost";
const PORT = process.env.DB_PORT || 27017;
const DATABASE = process.env.DB_DATABASE || "files_manager";
const url = `mongodb://${HOST}:${PORT}`;

// creates anew mongodb client
// and returns it
// console log if there is an error
class DBClient {
  constructor() {
    this.client = new MongoClient(url, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    this.client
      .connect()
      .then(() => {
        this.db = this.client.db(`${DATABASE}`);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * checks if client is alive
   * returns true if client is alive
   * false if client is not alive(otherwise)
   */
  isAlive() {
    return this.client.isConnected();
  }

  // an asynchronous function to
  // retrieve the number of users in the database
  async nbUsers() {
    const users = this.db.collection("users");
    const usrTtlNo = await users.countDocuments();
    return usrTtlNo;
  }

  // an asynchronous function to
  // return the no of documents in the collection files
  async nbFiles() {
    const files = this.db.collection("files");
    const flTtlNo = await files.countDocuments();
    return flTtlNo;
  }
}

// export db client
// create db client
const dbClient = new DBClient();
module.exports = dbClient;
