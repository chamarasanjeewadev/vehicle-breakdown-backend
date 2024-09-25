import express, { NextFunction, Request, Response } from "express";
import * as service from "../service/user/user.service";
import * as repository from "../repository/user.repository";
import { CustomError, ERROR_CODES } from "../utils/errorHandlingSetup";
import { requiredUserSchema, UserInput } from "../dto/user.dto";
import { authenticateJWT } from "../middleware/auth";
import { UserRegisterInput } from "../dto/userRequest.dto";
import { z } from "zod";
import { UserRepository } from "../repository/user.repository";
import { saveFcmToken } from "../service/user/user.service";
import { validateRequest } from "../middleware/requestValidator";
import { fcmTokenSchema, FcmTokenInput } from "../dto/fcmToken.dto";
import bodyParser from "body-parser";
import { Webhook } from "svix";
import { clerkClient } from '@clerk/clerk-sdk-node'

const router = express.Router();
const repo = repository.UserRepository;
// router.use(authenticateJWT(["user"]));
//@ts-ignore
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async function (req, res) {
    const WEBHOOK_SECRET = "whsec_j17GnOHaNIOJaOzsGNJdV0m6lCI/WalX"; // process.env.WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
      throw new Error("You need a WEBHOOK_SECRET in your .env");
    }

    const headers = req.headers;
    const payload = req.body;

    const svix_id = headers["svix-id"];
    const svix_timestamp = headers["svix-timestamp"];
    const svix_signature = headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ message: "Error occurred -- no svix headers" });
    }

    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // try {
    //   evt = wh.verify(payload, {
    //     "svix-id": svix_id as string,
    //     "svix-timestamp": svix_timestamp as string,
    //     "svix-signature": svix_signature as string,
    //   });
    // } catch (err: any) {
    //   return res.status(400).json({
    //     success: false,
    //     message: err.message,
    //   });
    // }

    evt = payload;
    console.log("data....", evt);

    if (evt.type === 'user.created') {
      const userData = evt.data;
      try {
        const userInfo=await repo.createUserFromWebhook(userData);
        const params = { userInfo: userInfo}

      const updatedUser = await clerkClient.users.updateUser(evt.data.id, params)
      console.log("updatedUser.....", updatedUser)
       if (userInfo.userId) {
      await clerkClient.users.updateUserMetadata(evt.data.id, {
        privateMetadata: {
          userInfo: userInfo,
        },
      });
    }

        return res.status(200).json({
          success: true,
          message: "User created and processed successfully",
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Error processing user creation",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  }
);

router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = requiredUserSchema.safeParse(req.body);
      console.log("result...", result);
      // TODO: do this in middlware
      if (!result.success) {
        throw new CustomError(
          ERROR_CODES.INVALID_INPUT,
          400,
          result.error.issues.map(issue => issue.message).join(", ")
        );
      }

      const { username, email, password, userType } = result.data;

      if (userType === "user") {
        const newUser = await service.CreateUser(
          { email, username, password },
          repo
        );

        res.status(201).json({
          message: "User registered successfully",
          user: newUser?.id,
        });
      } else {
        throw new CustomError(
          ERROR_CODES.INVALID_INPUT,
          401,
          "Invalid user type for user registration"
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ... other existing routes ...

router.get(
  "/profile",
  // authenticateJWT(["user"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("inside get profile......", req.query);
      const authId = req.query.authId as string;
      if (!authId) {
        throw new CustomError(
          ERROR_CODES.INVALID_INPUT,
          400,
          "authId is required"
        );
      }

      const userProfile = await service.getUserProfileByAuthId(authId, repo);
      if (!userProfile) {
        throw new CustomError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          404,
          "User profile not found"
        );
      }

      res.json(userProfile);
    } catch (error) {
      next(error);
    }
  }
);

// Add this new route
router.get(
  "/profile/:id",
  // authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new CustomError(
          ERROR_CODES.INVALID_INPUT,
          400,
          "Invalid user ID"
        );
      }

      const userProfile = await service.getUserProfileById(id, repo);
      if (!userProfile) {
        throw new CustomError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          404,
          "User profile not found"
        );
      }

      res.json(userProfile);
    } catch (error) {
      next(error);
    }
  }
);

// Add this new route
router.patch(
  "/profile/:id",
  // authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new CustomError(
          ERROR_CODES.INVALID_INPUT,
          400,
          "Invalid user ID"
        );
      }

      const updateData: Partial<UserRegisterInput> = req.body;

      // You might want to add validation for updateData here

      const updatedProfile = await service.updateUserProfile(
        id,
        updateData,
        repo
      );
      if (!updatedProfile) {
        throw new CustomError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          404,
          "User profile not found"
        );
      }

      res.json({
        message: "User profile updated successfully",
        user: updatedProfile,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/fcm-token", validateRequest(fcmTokenSchema), async (req, res) => {
  try {
    const { token, browserInfo, userId } = req.body as FcmTokenInput;
    console.log("req.body.........", req.body);
    const result = await saveFcmToken(
      userId,
      token,
      browserInfo,
      UserRepository
    );
    res.status(201).json(result);
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;