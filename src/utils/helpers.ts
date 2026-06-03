export const generateUnitsForBlock = (blockName: string, floorsCount: number, unitsPerFloor: number, existingUnits: any = null) => {
  const units: any = {};
  const blockLetter = blockName.replace(/Block\s+/i, '').trim().charAt(0) || 'U';
  
  for (let f = 1; f <= floorsCount; f++) {
    const floorUnits = [];
    for (let u = 1; u <= unitsPerFloor; u++) {
      const unitNum = `${blockLetter}-${f}${u < 10 ? '0' + u : u}`;
      
      let resident: string | null = null;
      let resident_phone: string | null = null;
      let resident_email: string | null = null;
      
      if (existingUnits && existingUnits[f]) {
        const found = existingUnits[f].find((item: any) => item.unit_number === unitNum);
        if (found) {
          resident = found.resident;
          resident_phone = found.resident_phone;
          resident_email = found.resident_email;
        }
      }

      floorUnits.push({
        unit_number: unitNum,
        resident,
        resident_phone,
        resident_email
      });
    }
    units[f] = floorUnits;
  }
  return units;
};

export const getInitials = (firstName: string, lastName: string) => {
  const f = firstName ? firstName.charAt(0) : '';
  const l = lastName ? lastName.charAt(0) : '';
  return (f + l).toUpperCase() || 'AS';
};

export const formatActivityTime = (timestampMs: number): string => {
  if (!timestampMs) return 'Recently';
  const now = Date.now();
  const diffSec = Math.floor((now - timestampMs) / 1000);

  if (diffSec < 60) {
    return 'Just now';
  }
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) {
    return 'Yesterday';
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }
  
  const date = new Date(timestampMs);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

