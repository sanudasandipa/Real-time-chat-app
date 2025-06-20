// Utility functions for generating placeholder images

export const generateUserPlaceholder = (username?: string, size: number = 40): string => {
  const initial = username ? username.charAt(0).toUpperCase() : 'U';
  const colors = [
    '#6B73FF', '#9B59B6', '#3498DB', '#E67E22', '#E74C3C', 
    '#2ECC71', '#F39C12', '#1ABC9C', '#34495E', '#95A5A6'
  ];
  
  // Generate a consistent color based on username
  let colorIndex = 0;
  if (username) {
    colorIndex = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  }
  
  const color = colors[colorIndex];
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${color}"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="${size * 0.4}" font-weight="600" fill="white">
        ${initial}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const generateGroupPlaceholder = (groupName?: string, size: number = 40): string => {
  const initial = groupName ? groupName.charAt(0).toUpperCase() : 'G';
  const colors = [
    '#7B68EE', '#20B2AA', '#FF6347', '#32CD32', '#FF69B4',
    '#4169E1', '#FF8C00', '#DC143C', '#00CED1', '#9932CC'
  ];
  
  // Generate a consistent color based on group name
  let colorIndex = 0;
  if (groupName) {
    colorIndex = groupName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  }
  
  const color = colors[colorIndex];
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="${size * 0.4}" font-weight="600" fill="white">
        ${initial}
      </text>
      <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.08}" fill="white" opacity="0.7"/>
      <circle cx="${size * 0.85}" cy="${size * 0.35}" r="${size * 0.06}" fill="white" opacity="0.5"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const getProfileImage = (user: any, size: number = 40): string => {
  if (user?.profilePic) {
    return user.profilePic;
  }
  return generateUserPlaceholder(user?.username, size);
};

export const getChatImage = (chat: any, currentUser: any, size: number = 40): string => {
  if (chat.isGroup) {
    if (chat.groupImage) {
      return chat.groupImage;
    }
    return generateGroupPlaceholder(chat.chatName, size);
  }
  
  const otherUser = chat.users?.find((u: any) => u._id !== currentUser?._id);
  if (otherUser?.profilePic) {
    return otherUser.profilePic;
  }
  return generateUserPlaceholder(otherUser?.username, size);
};
