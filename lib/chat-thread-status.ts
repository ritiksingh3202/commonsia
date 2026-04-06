/** ChatThread.status values */
export const CHAT_PENDING = "pending";
export const CHAT_ACTIVE = "active";
export const CHAT_DECLINED = "declined";

export type ChatThreadStatus = typeof CHAT_PENDING | typeof CHAT_ACTIVE | typeof CHAT_DECLINED;
