import { useState } from "react";
import type { PublicUser } from "@market/contracts";

export function UserAvatar({
  user,
  className = "",
}: {
  user: Pick<PublicUser, "name" | "avatarUrl">;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {user.avatarUrl && failedUrl !== user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          onError={() => setFailedUrl(user.avatarUrl!)}
        />
      ) : (
        user.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
