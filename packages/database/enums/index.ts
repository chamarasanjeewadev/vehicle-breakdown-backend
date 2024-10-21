export enum UserGroup {
  USER = "user",
  ADMIN = "admin",
  DRIVER = "driver",
}

export enum EmailNotificationType {
  DRIVER_REGISTERED_EMAIL = "DRIVER_REGISTERED_EMAIL",
  USER_REQUEST_EMAIL = "USER_REQUEST_EMAIL",
  USER_CREATED_EMAIL = "USER_CREATED_EMAIL",
  USER_ACCEPT_EMAIL = "USER_ACCEPT_EMAIL",
  DRIVER_REJECT_EMAIL = "DRIVER_REJECT_EMAIL",
  DRIVER_QUOTATION_UPDATED_EMAIL = "DRIVER_QUOTATION_UPDATED_EMAIL",
  DRIVER_ASSIGNED_EMAIL = "DRIVER_ASSIGNED_EMAIL",
  DRIVER_QUOTE_EMAIL = "DRIVER_QUOTE_EMAIL",
  DRIVER_ACCEPT_EMAIL = "DRIVER_ACCEPT_EMAIL",
  DRIVER_NOTIFICATION_EMAIL = "DRIVER_NOTIFICATION_EMAIL",
  USER_NOTIFICATION_EMAIL = "USER_NOTIFICATION_EMAIL",
  USER_REJECT_EMAIL = "USER_REJECT_EMAIL",
}

export enum DriverStatus {
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  QUOTED = "QUOTED",
  PENDING = "PENDING",
}

export enum UserStatus {
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  PENDING = "PENDING",
}

export enum PushNotificationType {
  DRIVER_ASSIGNED_NOTIFICATION = "DRIVER_ASSIGNED_NOTIFICATION",
}

export enum BaseNotificationType {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
}


