import { Router } from "express";
import AppController from "../controllers/AppController";
import UsersController from "../controllers/UsersController";
import AuthController from "../controllers/AuthController";
import FilesController from "../controllers/FilesController";

/**
 * Route to get all routes
 * returns a router
 * creates a new instance of the router
 */
const router = Router();

// route to get status
router.get("/status", AppController.getStatus);

// route to get statistics
router.get("/stats", AppController.getStats);

// route to create new user
router.post("/users", UsersController.postNew);

// route to connect
router.get("/connect", AuthController.getConnect);

// route to disconnect
router.get("/disconnect", AuthController.getDisconnect);

// route to get current user
router.get("/users/me", UsersController.getMe);

// route to upload files
router.post("/files", FilesController.postUpload);

// route to get files
router.get("/files/:id", FilesController.getShow);

// route to get all files
router.get("/files", FilesController.getIndex);

// route to publish files
router.put("/files/:id/publish", FilesController.putPublish);

// route to unpublish files
router.put("/files/:id/unpublish", FilesController.putUnpublish);

// route to get file
router.get("/files/:id/data", FilesController.getFile);

// route to delete file
// export the router to get them in other files
module.exports = router;
