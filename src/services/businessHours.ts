import { Business } from '../services/businesses';

export const isBusinessOpen = (business: Business): boolean => {
  if (!business.workingHours) {
    return false;
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[dayOfWeek];

  const hours = business.workingHours[today];

  if (!hours || !hours.open) {
    return false;
  }

  const [openHour, openMinute] = hours.start.split(':').map(Number);
  const [closeHour, closeMinute] = hours.end.split(':').map(Number);

  const openTime = new Date();
  openTime.setHours(openHour, openMinute, 0, 0);

  const closeTime = new Date();
  closeTime.setHours(closeHour, closeMinute, 0, 0);

  return now >= openTime && now <= closeTime;
};
