//@ts-nocheck
import {
  DB,
  driver,
  breakdownAssignment,
  breakdownRequest,
  customer,
  user,
  Customer,
} from "@breakdownrescue/database";
import { sql, eq, and } from "drizzle-orm";
import { DriverStatus, UserStatus } from "../enums";
import { DatabaseError } from "pg";
// Define a type for the nearby driver data
export type NearbyDriver = {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  vehicleType: string;
  distance: number;
};

export type DriverSearchRepositoryType = {
  findNearbyDrivers: (
    latitude: number,
    longitude: number
  ) => Promise<NearbyDriver[]>;

  updateDriverRequests: (
    requestId: number,
    nearbyDrivers: NearbyDriver[]
  ) => Promise<void>;

  getUserIdByRequestId: (
    requestId: number
  ) => Promise<{ userId: number; requestId: number }>;
  getUserByCustomerId: (customerId: number) => Promise<UserWithCustomer | null>;
};

// Add this import

// Add this type definition
type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

// @ts-nocheck
const findNearbyDrivers = async (
  latitude: number,
  longitude: number
): Promise<NearbyDriver[]> => {
  try {
    const nearbyDrivers = await DB.select({
      id: driver.id,
      // fullName: driver.fullName,
      // email: driver.email,
      // phoneNumber: driver.phoneNumber,
      // vehicleType: driver.vehicleType,
      distance: sql`
        ST_Distance(
          ${driver.primaryLocation}::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography
        ) / 1000
      `.as("distance"),
    })
      .from(driver)
      .where(
        sql`ST_DWithin(
          ${driver.primaryLocation}::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${driver.serviceRadius} * 1000
        )`
      )
      .orderBy(sql`distance`);
    console.log("nearbyDrivers", nearbyDrivers);
    // Use a type assertion here
    return nearbyDrivers as unknown as NearbyDriver[];
  } catch (error) {
    console.error("Error in findNearbyDrivers:", error);
    throw error; // Re-throw the error after logging
  }
};

const updateDriverRequests = async (
  requestId: number,
  nearbyDrivers: NearbyDriver[]
): Promise<void> => {
  const now = new Date();

  try {
    console.log("nearbyDrivers, before transaction", nearbyDrivers);
    await DB.transaction(async tx => {
      await tx
        .insert(breakdownAssignment)
        .values(
          nearbyDrivers.map(driver => ({
            requestId,
            driverId: driver.id,
            driverStatus: DriverStatus.PENDING,
            userStatus: UserStatus.PENDING,
            assignedAt: now,
            createdAt: now,
            updatedAt: now,
          }))
        )
        .onConflictDoUpdate({
          target: [breakdownAssignment.requestId, breakdownAssignment.driverId],
          set: {
            updatedAt: now,
          },
        });
    });
    console.log("nearbyDrivers, after transaction", nearbyDrivers);
  } catch (error) {
    console.error("Error in updateDriverRequests:", error);
    throw error; // Re-throw the error after logging
  }
};

// Add this function to your repository implementation
const getUserIdByRequestId = async (
  requestId: number
): Promise<{ userId: number; requestId: number }> => {
  try {
    console.log("requestId", requestId);
    const result = await DB.select({ userId: breakdownRequests.userId })
      .from(breakdownRequests)
      .where(eq(breakdownRequests.id, requestId))
      .limit(1);
    console.log("result", result);

    return result.length > 0 ? { userId: result[0].userId, requestId } : null;
  } catch (error) {
    console.error("Error in getUserIdByRequestId:", error);
    throw error; // Re-throw the error after logging
  }
};

// Add this function to your repository implementation
const getUserByCustomerId = async (customerId: number) => {
  try {
    console.log("Getting customer info for customerId:", customerId);
    const result = await DB.select({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: customer.mobileNumber,
      postcode: customer.postcode,
    })
      .from(customer)

      .innerJoin(user, eq(customer.userId, user.id))
      .where(eq(customer.id, customerId))
      .limit(1);

    console.log("Query result:", result);

    if (result.length === 0) {
      console.log("No user found for customerId:", customerId);
      return null;
    }

    return result[0];
  } catch (error) {
    console.error("Error in getUserByCustomerId:", error);
    if (error instanceof DatabaseError) {
      throw error;
    } else {
      throw new DatabaseError(
        `Failed to get user for customerId ${customerId}: ${
          (error as Error).message
        }`,
        (error as any).statusCode || 500,
        (error as Error).stack
      );
    }
  }
};

// Add this to your exported DriverSearchRepository object
export const DriverSearchRepository: DriverSearchRepositoryType = {
  findNearbyDrivers,
  updateDriverRequests,
  getUserIdByRequestId,
  getUserByCustomerId,
};
