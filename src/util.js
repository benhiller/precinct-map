export const TURNOUT_CONTEST = 'Turnout';

export const capitalizeName = name =>
  name
    .split(' ')
    .map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
