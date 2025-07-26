// src/utils/avatarUtils.js
import avatar1 from "../../assets/adventurer-1.png";
import avatar2 from "../../assets/adventurer-2.png";
import avatar3 from "../../assets/adventurer-3.png";
import avatar4 from "../../assets/adventurer-4.png";
import avatar5 from "../../assets/adventurer-5.png";

const avatarImages = [avatar1, avatar2, avatar3, avatar4, avatar5];

/**
 * Given an ID string, returns the avatar image URL.
 */
export function getAvatarForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarImages.length;
  return avatarImages[index];
}
