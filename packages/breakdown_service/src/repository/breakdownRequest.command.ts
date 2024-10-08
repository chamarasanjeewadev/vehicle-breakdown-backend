import { DB } from "@breakdownrescue/database";
import {
  breakdownRequest,
  breakdownAssignment,
} from "@breakdownrescue/database";
import { BreakdownRequestInput } from "../dto/breakdownRequest.dto";
import { eq, and } from "drizzle-orm";
import { UserStatus } from "../enums";
export type BreakdownRequestCommandType = {
  saveBreakdownRequest: (data: BreakdownRequestInput) => Promise<number>;
  updateUserStatusInBreakdownAssignment: (
    userId: number,
    assignmentId: number,
    userStatus: UserStatus
  ) => Promise<boolean>;
  updateDriverStatusInBreakdownAssignment: (
    assignmentId: number,
    userStatus: UserStatus
  ) => Promise<boolean>;
};

const saveBreakdownRequest = async (
  data: BreakdownRequestInput
): Promise<number> => {
  const breakdownResult = await DB.insert(breakdownRequest)
    .values({
      customerId: data.customerId,
      requestType: data.requestType,
      locationAddress: data.locationAddress,
      userLocation: {
        x: data.userLocation.longitude,
        y: data.userLocation.latitude,
      },
      description: data.description || null,
      status: UserStatus.PENDING,
    })
    .returning({ id: breakdownRequest.id });

  return breakdownResult[0].id;
};

const updateUserStatusInBreakdownAssignment = async (
  userId: number,
  assignmentId: number,
  userStatus: UserStatus
): Promise<boolean> => {
  const result = await DB.update(breakdownAssignment)
    .set({ userStatus })
    .where(
      and(
        eq(breakdownAssignment.id, assignmentId),
        eq(
          breakdownAssignment.requestId,
          DB.select({ id: breakdownRequest.id })
            .from(breakdownRequest)
            .where(eq(breakdownRequest.userId, userId))
            .limit(1)
        )
      )
    )
    .returning({ id: breakdownAssignment.id });

  return result.length > 0;
};

const updateDriverStatusInBreakdownAssignment = async (
  assignmentId: number,
  userStatus: UserStatus
): Promise<boolean> => {
  const result = await DB.update(breakdownAssignment)
    .set({ userStatus })
    .where(eq(breakdownAssignment.id, assignmentId))
    .returning({ id: breakdownAssignment.id });

  return result.length > 0;
};

export const BreakdownRequestCommand: BreakdownRequestCommandType = {
  saveBreakdownRequest,
  updateUserStatusInBreakdownAssignment,
  updateDriverStatusInBreakdownAssignment,
};
