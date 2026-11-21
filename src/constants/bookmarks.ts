import {BookmarkCategoryDef} from '../types/library';

export const DEFAULT_BOOKMARK_CATEGORIES: BookmarkCategoryDef[] = [
  {id: 'regular', label: 'Обычная', icon: 'bookmark', color: '#8C5E4D'},
  {id: 'important', label: 'Важное', icon: 'star', color: '#C2594B'},
  {id: 'quote', label: 'Цитата', icon: 'quote', color: '#6E7F6B'},
  {id: 'character', label: 'Персонаж', icon: 'user', color: '#5D6F8A'},
  {id: 'theory', label: 'Теория', icon: 'sparkles', color: '#7D6391'},
  {id: 'question', label: 'Вопрос', icon: 'help', color: '#B58445'},
  {id: 'emotion', label: 'Эмоция', icon: 'heart', color: '#B85D78'},
  {id: 'reread', label: 'Перечитать', icon: 'repeat', color: '#4B7F78'},
  {id: 'plot', label: 'Сюжет', icon: 'compass', color: '#6E5744'},
];

export const BOOKMARK_ICON_OPTIONS: {id: string; label: string; emoji: string}[] = [
  {id: 'bookmark', label: 'Закладка', emoji: '🔖'},
  {id: 'star', label: 'Звезда', emoji: '⭐'},
  {id: 'quote', label: 'Цитата', emoji: '💬'},
  {id: 'user', label: 'Персонаж', emoji: '👤'},
  {id: 'sparkles', label: 'Идея', emoji: '✨'},
  {id: 'help', label: 'Вопрос', emoji: '❓'},
  {id: 'heart', label: 'Сердце', emoji: '❤️'},
  {id: 'repeat', label: 'Повтор', emoji: '🔁'},
  {id: 'compass', label: 'Сюжет', emoji: '🧭'},
  {id: 'leaf', label: 'Лист', emoji: '🌿'},
  {id: 'moon', label: 'Луна', emoji: '🌙'},
  {id: 'key', label: 'Ключ', emoji: '🗝️'},
];

export const BOOKMARK_COLOR_PALETTE: {name: string; value: string}[] = [
  {name: 'Терракота', value: '#8C5E4D'},
  {name: 'Кармин', value: '#C2594B'},
  {name: 'Шалфей', value: '#6E7F6B'},
  {name: 'Грифельно-синий', value: '#5D6F8A'},
  {name: 'Слива', value: '#7D6391'},
  {name: 'Охра', value: '#B58445'},
  {name: 'Пыльная роза', value: '#B85D78'},
  {name: 'Хвойный', value: '#4B7F78'},
  {name: 'Графит', value: '#524E4A'},
];
