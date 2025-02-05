import { dfn, weekly } from '../deps.ts';
import { getLunchDate } from './date.ts';
import * as karen from './karen.ts';
import * as linsen from './linsen.ts';

export interface WeekMenu {
  date: Date;
  days: Menu[];
}

export interface Menu {
  date: Date;
  dishes: Dishes;
}

export interface Dishes {
  swedish: Dish[];
  english: Dish[];
}

export interface Dish {
  type?: string;
  name: string;
}

export interface Resturant {
  weekFetcher: WeekMenuFetcher;
  nextWeekFetcher?: WeekMenuFetcher;
}

export type Lang = 'Swedish' | 'English';
export type WeekMenuFetcher = () => Promise<WeekMenu>;

class LunchProvider {
  #resturants: Map<string, Resturant>;
  #cache: Map<string, WeekMenu> = new Map();

  constructor(resturants: [string, Resturant][]) {
    this.#resturants = new Map(resturants);
  }

  public getMenu(name: string, date: Date): Menu {
    const menu = this.#cache.get(name);
    if (!menu) {
      throw new Error(`No menu for ${name} available`);
    }
    const startDate = dfn.startOfDay(date);
    const todaysMenu = menu.days.find((day) =>
      dfn.isEqual(dfn.startOfDay(day.date), startDate)
    );
    if (!todaysMenu) {
      throw new Error(`No menu for ${name} on ${date}`);
    }
    return todaysMenu;
  }

  public getTodaysMenu(name: string, lang: Lang): Dish[] {
    const menu = this.getMenu(name, getLunchDate());
    if (lang === 'Swedish') {
      return menu.dishes.swedish;
    } else if (lang === 'English') {
      return menu.dishes.english;
    } else {
      throw new Error(`Unknown language ${lang}`);
    }
  }

  async cacheAll() {
    console.info('Caching all menus');
    for (const [name, resturant] of this.#resturants) {
      const fetcher = dfn.isWeekend(new Date())
        ? resturant.nextWeekFetcher
        : resturant.weekFetcher;
      let menu: WeekMenu | undefined;
      console.info(`Fetching ${name}`);
      const t1 = performance.now();
      if (fetcher) {
        menu = await fetcher();
      }
      const t2 = performance.now();
      console.info(`Fetched ${name} in ${t2 - t1}ms`);
      if (menu) {
        this.#cache.set(name, menu);
      } else {
        this.#cache.delete(name);
      }
    }
    console.info('Done caching all menus');
  }
}

export const lunchProvider = new LunchProvider([
  [
    'johanneberg-express',
    karen.createResturant('3d519481-1667-4cad-d2a3-08d558129279'),
  ],
  [
    'karresturangen',
    karen.createResturant('21f31565-5c2b-4b47-d2a1-08d558129279'),
  ],
  ['hyllan', karen.createResturant('a7f0f75b-c1cb-4fc3-d2a6-08d558129279')],
  ['smak', karen.createResturant('3ac68e11-bcee-425e-d2a8-08d558129279')],
  ['linsen', linsen.createResturant()],
]);

await lunchProvider.cacheAll();

weekly(() => {
  lunchProvider.cacheAll();
}, '1,6');
