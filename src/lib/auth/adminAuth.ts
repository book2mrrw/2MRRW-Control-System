/** Single admin operator for the Control System. */
export const ADMIN_USER_ID = "545cd959-5cae-4009-8a91-1c46fe2f4d27";
export const ADMIN_EMAIL = "book2mrrw@gmail.com";

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId === ADMIN_USER_ID;
}
