// Pure rules for the admin panel.

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// RACING- + 6 random uppercase alphanumerics, from a CSPRNG.
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  // 256 % 36 bias is negligible for an invite code.
  const suffix = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `RACING-${suffix}`;
}

type MemberRole = { id: string; is_admin: boolean; is_active: boolean };
export type MemberPatch = { department_id?: string; is_admin?: boolean; is_active?: boolean };

// True when applying `patch` to `profileId` would leave no active admin.
export function removesLastAdmin(members: MemberRole[], profileId: string, patch: MemberPatch): boolean {
  const after = members.map((m) =>
    m.id === profileId
      ? { ...m, is_admin: patch.is_admin ?? m.is_admin, is_active: patch.is_active ?? m.is_active }
      : m,
  );
  const activeAdminsBefore = members.filter((m) => m.is_admin && m.is_active).length;
  const activeAdminsAfter = after.filter((m) => m.is_admin && m.is_active).length;
  return activeAdminsBefore > 0 && activeAdminsAfter === 0;
}
