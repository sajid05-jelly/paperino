"use client";

import { useAuth } from "@/context/AuthContext";
import AvatarSelectorModal from "./AvatarSelectorModal";

export default function AvatarProvider() {
  const { user, loading, paperinoAvatar, setPaperinoAvatar } = useAuth();

  // Show modal if user is logged in, finished loading, and hasn't picked an avatar
  const needsAvatar = !!user && !loading && paperinoAvatar === null;

  return (
    <AvatarSelectorModal 
      isOpen={needsAvatar} 
      onSelect={setPaperinoAvatar} 
      isFirstLogin={true} 
    />
  );
}
