const MongoClient = require("mongodb").MongoClient;

// url: mongodb://localhost:27017
const url = "mongodb://localhost:27017";

// database name
const dbName = "files_manager";

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
  if (err) {
    console.error("error connecting to MongoDB: ", err);
    return;
  }

  console.log("Connected successfully");

  // get db instance
  const db = client.db(dbName);

  // ensure collections exist and has data
  checkAndInsert(db, "users", 4, { name: "User" });

  // ensure collections exist and has data
  checkAndInsert(db, "files", 30, { name: "File" });
});

// check if collections exist and insert data if not
// requiredCount: number of documents to insert
function checkAndInsert(db, collectionName, requiredCount) {
  const collection = db.collection(collectionName);
  collection.countDocuments((err, kkount) => {
    if (err) {
      console.error(`error counting documents in '${collectionName}': `, err);
      return;
    }

    if (kkount < requiredCount) {
      const documents = Array.from(
        { length: requiredCount - kkount },
        (_, intgr) => {
          return { name: `${collectionName} ${intgr + kkount + 1}` };
        }
      );

      collection.insertMany(documents, (err, result) => {
        if (err) {
          console.error(
            `error inserting documents into '${collectionName}': `,
            err
          );
        }
      });
    }
  });
}
