/** Wpis w Galerii Gier. Źródło prawdy: public/gry/katalog.json */
export interface Gra {
  id: string;
  tytul: string;
  opis: string;
  /** Jak gracz odpala tytuł. */
  dystrybucja: 'przegladarka' | 'pobranie' | 'serwer';
  /** przegladarka → ścieżka do index.html; pobranie → ścieżka do pliku; serwer → host. */
  cel: string;
  /** Cena w GRV. 0 = darmowe. */
  grv: number;
  silnik?: 'unreal' | 'unity' | 'godot' | 'custom' | 'web';
  okladka?: string;
  status: 'wydana' | 'w_budowie' | 'koncept';
}
