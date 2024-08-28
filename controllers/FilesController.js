import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import { ObjectID } from "mongodb";
import mime from "mime-types";
import Queue from "bull";
import dbClient from "../utils/db";
import redisClient from "../utils/redis";

const fileQueue = new Queue("fileQueue");
/**
 * files controller class
 * handles file requests
 * returns files
 * expects token in header
 * else returns unauthorized
 */
class FilesController {
  static async getUser(request) {
    const token = request.header("X-Token");
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (userId) {
      const usersCollection = dbClient.db.collection("users");
      const idObjct = new ObjectID(userId);
      const user = await usersCollection.findOne({ _id: idObjct });
      if (!user) {
        return null;
      }
      return user;
    }
    return null;
  }

  /**
   * Handles file upload requests
   * returns created file
   * expects token in header
   * else returns unauthorized
   */
  static async postUpload(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const { name } = request.body;
    const { type } = request.body;
    const { parentId } = request.body;
    const isPublic = request.body.isPublic || false;
    const { data } = request.body;
    if (!name) {
      return response.status(400).json({ error: "Missing name" });
    }
    if (!type) {
      return response.status(400).json({ error: "Missing type" });
    }
    if (type !== "folder" && !data) {
      return response.status(400).json({ error: "Missing data" });
    }

    // check if parent exists
    // check if parent is a folder
    // if not return error
    // if yes create file
    const files = dbClient.db.collection("files");
    if (parentId) {
      const idObjct = new ObjectID(parentId);
      const file = await files.findOne({ _id: idObjct, userId: user._id });
      if (!file) {
        return response.status(400).json({ error: "Parent not found" });
      }
      if (file.type !== "folder") {
        return response.status(400).json({ error: "Parent is not a folder" });
      }
    }
    if (type === "folder") {
      files
        .insertOne({
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic,
        })
        .then((result) =>
          response.status(201).json({
            id: result.insertedId,
            userId: user._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
          })
        )
        .catch((error) => {
          console.log(error);
        });
    } else {
      const filePath = process.env.FOLDER_PATH || "/tmp/files_manager";
      const flName = `${filePath}/${uuidv4()}`;
      const buff = Buffer.from(data, "base64");
      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {}
        await fs.writeFile(flName, buff, "utf-8");
      } catch (error) {
        console.log(error);
      }
      files
        .insertOne({
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: flName,
        })
        .then((result) => {
          response.status(201).json({
            id: result.insertedId,
            userId: user._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
          });
          if (type === "image") {
            fileQueue.add({
              userId: user._id,
              fileId: result.insertedId,
            });
          }
        })
        .catch((error) => console.log(error));
    }
    return null;
  }

  /**
   * Handles file show requests
   * returns file
   * expects token in header
   * else returns unauthorized
   */
  static async getShow(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const fileId = request.params.id;
    const files = dbClient.db.collection("files");
    const idObjct = new ObjectID(fileId);
    const file = await files.findOne({ _id: idObjct, userId: user._id });
    if (!file) {
      return response.status(404).json({ error: "Not found" });
    }
    return response.status(200).json(file);
  }
  /**
   * Handles file index requests
   * returns files
   * expects token in header
   * else returns unauthorized
   */
  static async getIndex(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const { parentId, page } = request.query;
    const pageNum = page || 0;
    const files = dbClient.db.collection("files");
    let query;
    if (!parentId) {
      query = { userId: user._id };
    } else {
      query = { userId: user._id, parentId: ObjectID(parentId) };
    }
    files
      .aggregate([
        { $match: query },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [
              { $count: "total" },
              { $addFields: { page: parseInt(pageNum, 10) } },
            ],
            data: [{ $skip: 20 * parseInt(pageNum, 10) }, { $limit: 20 }],
          },
        },
      ])
      .toArray((err, result) => {
        if (result) {
          const finalrslt = result[0].data.map((file) => {
            const tempraryfls = {
              ...file,
              id: file._id,
            };
            delete tempraryfls._id;
            delete tempraryfls.localPath;
            return tempraryfls;
          });
          return response.status(200).json(finalrslt);
        }
        console.log("Error occured");
        return response.status(404).json({ error: "Not found" });
      });
    return null;
  }
  /**
   * Handles file publish requests
   */
  static async putPublish(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const { id } = request.params;
    const files = dbClient.db.collection("files");
    const idObjct = new ObjectID(id);
    const brandnewVl = { $set: { isPublic: true } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate(
      { _id: idObjct, userId: user._id },
      brandnewVl,
      options,
      (err, file) => {
        if (!file.lastErrorObject.updatedExisting) {
          return response.status(404).json({ error: "Not found" });
        }
        return response.status(200).json(file.value);
      }
    );
    return null;
  }

  /**
   * returns file
   */
  static async putUnpublish(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const { id } = request.params;
    const files = dbClient.db.collection("files");
    const idObjct = new ObjectID(id);
    const brandnewVl = { $set: { isPublic: false } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate(
      { _id: idObjct, userId: user._id },
      brandnewVl,
      options,
      (err, file) => {
        if (!file.lastErrorObject.updatedExisting) {
          return response.status(404).json({ error: "Not found" });
        }
        return response.status(200).json(file.value);
      }
    );
    return null;
  }

  /**
   * Handles file download requests
   */
  static async getFile(request, response) {
    const { id } = request.params;
    const files = dbClient.db.collection("files");
    const idObjct = new ObjectID(id);
    files.findOne({ _id: idObjct }, async (err, file) => {
      if (!file) {
        return response.status(404).json({ error: "Not found" });
      }
      console.log(file.localPath);
      if (file.isPublic) {
        if (file.type === "folder") {
          return response
            .status(400)
            .json({ error: "The folder doesn't have content" });
        } // error handling
        try {
          let flName = file.localPath;
          const size = request.param("size");
          if (size) {
            flName = `${file.localPath}_${size}`;
          }
          const data = await fs.readFile(flName);
          const contentType = mime.contentType(file.name);
          return response
            .header("Content-Type", contentType)
            .status(200)
            .send(data);
        } catch (error) {
          console.log(error);
          return response.status(404).json({ error: "Not found" });
        }
      } else {
        const user = await FilesController.getUser(request);
        if (!user) {
          return response.status(404).json({ error: "Not found" });
        }
        if (file.userId.toString() === user._id.toString()) {
          if (file.type === "folder") {
            return response
              .status(400)
              .json({ error: "Thefolder does not have content" });
          }
          try {
            let flName = file.localPath;
            const size = request.param("size");
            if (size) {
              flName = `${file.localPath}_${size}`;
            }
            const contentType = mime.contentType(file.name);
            return response
              .header("Content-Type", contentType)
              .status(200)
              .sendFile(flName);
          } catch (error) {
            console.log(error);
            return response.status(404).json({ error: "Not found" });
          }
        } else {
          console.log(
            `Wrong user: file.userId=${file.userId}; userId=${user._id}`
          );
          return response.status(404).json({ error: "Not found" });
        }
      }
    });
  }
}

// export files controller
module.exports = FilesController;
