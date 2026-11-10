(() => {
  const POS = {
    base: 'https://satisfecho.de',
    tenantId: 186,
    tableMenu: 'https://satisfecho.de/menu/f66b0751-357c-452d-8669-795c6f303305',
  };

  const IMG = 'assets/menu-recortes';

  const CAT_ICONS = {
    kebab: 'lunch_dining',
    tacos: 'tapas',
    platos: 'restaurant',
    hamburguesas: 'lunch_dining',
    ofertas: 'local_offer',
    combos: 'restaurant_menu',
    pizzas: 'local_pizza',
    bebidas: 'local_bar',
  };

  const POS_CATEGORY_TO_SECTION = {
    'plato-principal': 'platos',
    platos: 'platos',
    'main-course': 'platos',
    bebidas: 'bebidas',
    beverages: 'bebidas',
    durums: 'kebab',
    durum: 'kebab',
    kebab: 'kebab',
    extras: 'hamburguesas',
    sides: 'platos',
    hamburguesas: 'hamburguesas',
    ofertas: 'ofertas',
    pitas: 'kebab',
    pizzas: 'pizzas',
    tacos: 'tacos',
    combos: 'combos',
  };

  const PIZZA_SIZES = [
    { size: 'pequena', label: 'Pequeña', price: '7 €' },
    { size: 'mediana', label: 'Mediana', price: '9 €' },
    { size: 'familiar', label: 'Familiar', price: '14 €' },
  ];

  const pizza = (name, description) => ({
    name,
    description,
    price: '7 € · 9 € · 14 €',
    sizePrices: PIZZA_SIZES.map((row) => ({ ...row })),
  });

  const MENU_FALLBACK = [
    {
      id: 'kebab',
      title: 'Kebab y dürüm',
      icon: CAT_ICONS.kebab,
      items: [
        {
          name: 'Dürüm Rollo XL',
          price: '9,99 €',
          description: 'Carne, lechuga, tomate, cebolla y salsa. Menú 7,99 €',
          imageUrl: `${IMG}/01-platos/01-durum-rollo-xl.png`,
        },
        {
          name: 'Dürüm Rollo',
          price: '8,99 €',
          description: 'Carne, lechuga, tomate, cebolla y salsa. Menú 6,99 €',
          imageUrl: `${IMG}/01-platos/02-durum-rollo.png`,
        },
        {
          name: 'Dürüm Rollo básico',
          price: '7,99 €',
          description: 'Carne, lechuga, tomate, cebolla y salsa. Menú 5,99 €',
          imageUrl: `${IMG}/01-platos/04-durum-rollo-basico.png`,
        },
      ],
    },
    {
      id: 'tacos',
      title: 'Tacos',
      icon: CAT_ICONS.tacos,
      items: [
        {
          name: 'Taco de pollo',
          price: '9,00 €',
          description: 'Pollo, ensalada y salsa. Menú 7,00 €',
          imageUrl: `${IMG}/01-platos/10-taco-de-pollo.png`,
        },
        {
          name: 'Taco gratinado',
          price: '10,00 €',
          description: 'Pollo, ensalada y salsa. Menú 8,00 €',
          imageUrl: `${IMG}/01-platos/11-taco-gratinado.png`,
        },
      ],
    },
    {
      id: 'platos',
      title: 'Platos',
      icon: CAT_ICONS.platos,
      items: [
        {
          name: 'Plato falafel',
          price: '5,99 €',
          description: 'Falafel, ensalada, tomate, cebolla y salsa',
          imageUrl: `${IMG}/01-platos/03-plato-falafel.png`,
        },
        {
          name: 'Cheese frís',
          price: '6,99 €',
          description: 'Con carne y queso fundido. Menú 5,99 €',
          imageUrl: `${IMG}/01-platos/06-cheese-fris.png`,
        },
        {
          name: 'Plato kebab grande',
          price: '6,99 €',
          description: 'Carne, ensalada, pan y salsa. Menú 5,99 €',
          imageUrl: `${IMG}/01-platos/07-plato-kebab-grande.png`,
        },
        {
          name: 'Plato kebab mediano',
          price: '6,99 €',
          description: 'Carne, ensalada, pan y salsa. Menú 4,99 €',
          imageUrl: `${IMG}/01-platos/08-plato-kebab-mediano.png`,
        },
        {
          name: 'Nachos',
          price: '5,99 €',
          description: 'Con carne, queso y salsa',
          imageUrl: `${IMG}/01-platos/09-nachos.png`,
        },
        {
          name: 'Frankfurt con patatas',
          price: '5,50 €',
          description: 'Con kétchup o mostaza',
          imageUrl: `${IMG}/02-combos-ofertas/03-frankfurt-con-patatas.png`,
        },
        {
          name: 'Alitas de pollo',
          price: '6,50 €',
          description: 'Con patatas y ensalada',
          imageUrl: `${IMG}/02-combos-ofertas/04-alitas-de-pollo.png`,
        },
      ],
    },
    {
      id: 'hamburguesas',
      title: 'Hamburguesas',
      icon: CAT_ICONS.hamburguesas,
      items: [
        {
          name: 'Hamburguesa',
          price: '6,99 €',
          description: 'Carne, lechuga, tomate y salsa. Menú 4,99 €',
          imageUrl: `${IMG}/01-platos/05-hamburguesa.png`,
        },
      ],
    },
    {
      id: 'ofertas',
      title: 'Ofertas',
      icon: CAT_ICONS.ofertas,
      items: [
        {
          name: 'Oferta nº1 · 3 dürüm',
          price: '22,50 €',
          description: 'Con patatas y bebida',
          imageUrl: `${IMG}/02-combos-ofertas/05-oferta-1-3-durum.png`,
        },
        {
          name: 'Oferta nº2 · 3 döner / pita',
          price: '19,99 €',
          description: 'Con patatas y bebida',
          imageUrl: `${IMG}/02-combos-ofertas/06-oferta-2-3-doner-pita.png`,
        },
        {
          name: 'Oferta nº3 · menú pizza peq.',
          price: '9,99 €',
          description: 'Pizza pequeña con patatas y bebida',
          imageUrl: `${IMG}/02-combos-ofertas/07-oferta-3-menu-pizza-peq.png`,
        },
        {
          name: 'Oferta nº4 · 2 hamburguesas',
          price: '13,99 €',
          description: 'Con patatas y bebida',
          imageUrl: `${IMG}/02-combos-ofertas/08-oferta-4-2-hamburguesas.png`,
        },
        {
          name: 'Oferta nº5 · calzone',
          price: '11,99 €',
          description: 'Con patatas y bebida',
          imageUrl: `${IMG}/02-combos-ofertas/09-oferta-5-calzone.png`,
        },
        {
          name: 'Oferta nº6 · menú pizza grande',
          price: '16,99 €',
          description: 'Pizza grande con patatas y bebida',
          imageUrl: `${IMG}/02-combos-ofertas/10-oferta-6-menu-pizza-grande.png`,
        },
      ],
    },
    {
      id: 'combos',
      title: 'Combos',
      icon: CAT_ICONS.combos,
      items: [
        {
          name: 'Combo nº1 · 1 dürüm rollo',
          price: '12,99 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/01-combo-1-1-durum-rollo.png`,
        },
        {
          name: 'Combo nº2 · 2 dürüm rollo',
          price: '17,50 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/02-combo-2-2-durum-rollo.png`,
        },
        {
          name: 'Combo nº3 · 3 dürüm rollo',
          price: '23,50 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/03-combo-3-3-durum-rollo.png`,
        },
        {
          name: 'Combo nº4 · 1 dürüm + pizza peq.',
          price: '13,50 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/04-combo-4-1-durum-1-pizza-peq.png`,
        },
        {
          name: 'Combo nº5 · 1 dürüm + pizza peq.',
          price: '18,00 €',
          description: 'Con refresco 2L',
          imageUrl: `${IMG}/03-combos/05-combo-5-1-durum-1-pizza-peq.png`,
        },
        {
          name: 'Combo nº6 · 2 dürüm + pizza peq.',
          price: '23,50 €',
          description: 'Con refresco 2L',
          imageUrl: `${IMG}/03-combos/06-combo-6-2-durum-1-pizza-peq.png`,
        },
        {
          name: 'Combo nº7 · 2 tacos',
          price: '21,00 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/07-combo-7-2-tacos.png`,
        },
        {
          name: 'Combo nº8 · 4 dürüm + pita',
          price: '26,00 €',
          description: 'Con patatas y bebida',
          imageUrl: `${IMG}/03-combos/08-combo-8-4-durum-1-pita.png`,
        },
        {
          name: 'Combo nº9 · 3 tacos gratinados',
          price: '29,99 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/09-combo-9-3-tacos-gratinados.png`,
        },
        {
          name: 'Combo nº10 · 4 dürüm + rollo',
          price: '28,99 €',
          description: 'Con patatas y bebida',
          imageUrl: `${IMG}/03-combos/10-combo-10-4-durum-1-rollo.png`,
        },
        {
          name: 'Combo nº11 · 2 pizzas familiar',
          price: '34,00 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/11-combo-11-2-pizzas-fam.png`,
        },
        {
          name: 'Combo nº12 · 3 pizzas medianas',
          price: '28,00 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/12-combo-12-3-pizzas-med.png`,
        },
        {
          name: 'Combo nº13 · 2 pizzas medianas',
          price: '21,00 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/13-combo-13-2-pizzas-med.png`,
        },
        {
          name: 'Combo nº14 · 2 pizzas pequeñas',
          price: '17,00 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/14-combo-14-2-pizzas-peq.png`,
        },
        {
          name: 'Combo nº15 · 3 pizzas medianas',
          price: '22,50 €',
          description: 'Con bebida',
          imageUrl: `${IMG}/03-combos/15-combo-15-3-pizzas-med.png`,
        },
      ],
    },
    {
      id: 'pizzas',
      title: 'Pizzas',
      range: 'Pequeña 7 € · Mediana 9 € · Familiar 14 €',
      icon: CAT_ICONS.pizzas,
      items: [
        pizza('Margarita', 'Salsa de tomate, queso y orégano'),
        pizza('Salami', 'Salsa de tomate, queso, salami y orégano'),
        pizza('Döner', 'Salsa de tomate, queso, carne de pollo, ternera o kebab y orégano'),
        pizza('4 quesos', 'Salsa de tomate, queso, 4 quesos y orégano'),
        pizza('Hawaiana', 'Salsa de tomate, queso, salami, piña y orégano'),
        pizza('Vegetal', 'Salsa de tomate, queso, champiñones, pimientos, maíz, aceitunas, espinacas y orégano'),
        pizza('Atún', 'Salsa de tomate, atún, queso, cebolla y orégano'),
        pizza('4 porciones', 'Salsa de tomate, queso, 1/4 salami, carne de pollo, champiñones, pimientos y orégano'),
        pizza('Gamba', 'Salsa de tomate, queso, gambas y orégano'),
        pizza('Barbacoa', 'Salsa barbacoa, queso, carne de pollo, champiñones y orégano'),
        pizza('Atún gamba', 'Salsa de tomate, queso, atún, gambas, cebolla y orégano'),
        pizza('Carbonara', 'Salsa carbonara, queso, panceta, cebolla, champiñones y orégano'),
        pizza('Frankfurt', 'Salsa de tomate, queso, frankfurt de pollo y orégano'),
        pizza('Pavo', 'Salsa de tomate, queso, pavo y orégano'),
        pizza('Búfalo chicken', 'Salsa barbacoa, pollo, champiñones y orégano'),
      ],
    },
  ];

  const DAYS = [
    { key: 1, open: 12 * 60 + 30, close: 23 * 60 + 30, label: '12:30 — 23:30' },
    { key: 2, open: 12 * 60 + 30, close: 23 * 60 + 30, label: '12:30 — 23:30' },
    { key: 3, open: 12 * 60 + 30, close: 23 * 60 + 30, label: '12:30 — 23:30' },
    { key: 4, open: 12 * 60 + 30, close: 23 * 60 + 30, label: '12:30 — 23:30' },
    { key: 5, open: 12 * 60 + 30, close: 24 * 60, label: '12:30 — 00:00' },
    { key: 6, open: 12 * 60 + 30, close: 24 * 60, label: '12:30 — 00:00' },
    { key: 0, open: 12 * 60 + 30, close: 23 * 60 + 30, label: '12:30 — 23:30' },
  ];

  const POS_DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const POS_DAY_TO_KEY = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };

  const madridNow = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }[map.weekday];
    const hour = Number(map.hour === '24' ? 0 : map.hour);
    const minute = Number(map.minute);
    return { weekday, minutes: hour * 60 + minute };
  };

  const applyHours = () => {
    const now = madridNow();
    const today = DAYS.find((d) => d.key === now.weekday);
    const overnight = today.close <= today.open;
    const isOpen = overnight
      ? now.minutes >= today.open || now.minutes < today.close
      : now.minutes >= today.open && now.minutes < today.close;
    const closeLabel = today.label.includes('—') ? today.label.split('—')[1].trim() : today.label;

    document.querySelectorAll('[data-hours-row]').forEach((row) => {
      const day = Number(row.getAttribute('data-hours-row'));
      row.classList.toggle('is-today', day === now.weekday);
    });

    document.querySelectorAll('[data-open-state]').forEach((el) => {
      el.dataset.openState = isOpen ? 'open' : 'closed';
      el.textContent = isOpen ? 'Abierto ahora' : 'Cerrado ahora';
    });

    document.querySelectorAll('[data-close-hint]').forEach((el) => {
      if (today.label === 'Cerrado') {
        el.textContent = 'Cerrado hoy';
        return;
      }
      el.textContent = isOpen ? `Cierre: ${closeLabel}` : `Abre a las ${today.label.split('—')[0].trim()}`;
    });
  };

  const THEME_KEY = 'kf-theme';

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('[data-theme-icon]').forEach((icon) => {
      icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    });
    document.querySelectorAll('[data-theme-switch]').forEach((btn) => {
      btn.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
    });
  };

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    applyTheme(savedTheme);
  }

  document.querySelectorAll('[data-theme-switch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  });

  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const burger = document.getElementById('burger');

  const setNav = (open) => {
    drawer.hidden = !open;
    backdrop.hidden = !open;
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    burger.querySelector('.material-symbols-outlined').textContent = open ? 'close' : 'menu';
    document.body.classList.toggle('nav-locked', open);
  };

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    setNav(drawer.hidden);
  });
  backdrop.addEventListener('click', () => setNav(false));
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setNav(false)));

  const esc = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const normalizeName = (name) =>
    String(name ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/^[0-9]+\.\s*/, '')
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const familyName = (normalized) =>
    normalized.replace(/\s*\((pequena|mediana|familiar)\)\s*$/i, '').trim();

  const slugKey = (value) => normalizeName(value).replace(/\s+/g, '-');

  const mappedSectionId = (raw) => {
    const key = slugKey(raw ?? '');
    if (!key) {
      return undefined;
    }
    return POS_CATEGORY_TO_SECTION[key] ?? key;
  };

  const formatPosPrice = (product, currency) => {
    const formatted = product.price_formatted?.trim() ?? '';
    if (formatted) {
      return /€|EUR/i.test(formatted) ? formatted : `${formatted} €`;
    }
    if (typeof product.price_cents !== 'number') {
      return undefined;
    }
    const value = (product.price_cents / 100).toFixed(2).replace('.', ',');
    return currency === 'EUR' || !currency ? `${value} €` : `${value} ${currency}`;
  };

  const resolveImageUrl = (raw) => {
    const value = raw?.trim() ?? '';
    if (!value) {
      return undefined;
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    if (!value.startsWith('/')) {
      return undefined;
    }
    if (value.startsWith('/uploads/')) {
      return `${POS.base}/api${value}`;
    }
    return `${POS.base}${value}`;
  };

  const cloneMenu = (sections) =>
    sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        sizePrices: item.sizePrices?.map((row) => ({ ...row })),
      })),
    }));

  const buildPosIndex = (dto) => {
    const exact = new Map();
    for (const cat of dto.categories ?? []) {
      for (const product of cat.products ?? []) {
        if (!product.available) {
          continue;
        }
        const key = normalizeName(product.name);
        if (!key) {
          continue;
        }
        exact.set(key, {
          imageUrl: resolveImageUrl(product.image_url),
          price: formatPosPrice(product, dto.currency),
          description: product.description?.trim() || undefined,
          productId: product.id,
          priceCents: product.price_cents,
        });
        const family = familyName(key);
        if (family && !exact.has(family)) {
          exact.set(family, exact.get(key));
        }
      }
    }
    return exact;
  };

  const overlayFromPos = (sections, dto) => {
    const products = (dto.categories ?? []).flatMap((cat) => cat.products ?? []);
    if (!products.some((p) => p.available)) {
      return sections;
    }

    const index = buildPosIndex(dto);
    const overlaid = sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        const exactHit = index.get(normalizeName(item.name));
        const match = exactHit ?? index.get(familyName(normalizeName(item.name)));
        if (!match && !item.sizePrices?.length) {
          return item;
        }
        const sizePrices = item.sizePrices?.map((row) => {
          const hit = index.get(normalizeName(`${item.name} (${row.label})`));
          if (!hit?.productId) {
            return row;
          }
          return {
            ...row,
            productId: hit.productId,
            priceCents: hit.priceCents,
            price: hit.price || row.price,
          };
        });
        if (!match) {
          return { ...item, sizePrices };
        }
        return {
          ...item,
          imageUrl: match.imageUrl || item.imageUrl,
          price: match.price || item.price,
          description: match.description || item.description,
          productId: exactHit?.productId,
          priceCents: exactHit?.priceCents,
          sizePrices,
        };
      }),
    }));

    const covered = new Set();
    for (const section of overlaid) {
      for (const item of section.items) {
        const key = normalizeName(item.name);
        covered.add(key);
        covered.add(familyName(key));
      }
    }

    const extras = new Map();
    const seen = new Set();
    const merged = overlaid.slice();
    const sectionIds = new Set(merged.map((s) => s.id));
    for (const cat of dto.categories ?? []) {
      for (const product of cat.products ?? []) {
        if (!product.available || seen.has(product.id)) {
          continue;
        }
        seen.add(product.id);
        const key = normalizeName(product.name);
        if (!key || covered.has(key) || covered.has(familyName(key))) {
          continue;
        }
        if (typeof product.price_cents === 'number' && product.price_cents <= 0) {
          continue;
        }
        const sectionId =
          mappedSectionId(product.subcategory) ||
          mappedSectionId(cat.id) ||
          mappedSectionId(product.category) ||
          mappedSectionId(cat.name) ||
          'otros';
        if (!sectionIds.has(sectionId)) {
          merged.push({
            id: sectionId,
            title: cat.name?.trim() || 'Otros',
            icon: CAT_ICONS[sectionId] || 'restaurant_menu',
            items: [],
          });
          sectionIds.add(sectionId);
        }
        const line = {
          name: product.name,
          price: formatPosPrice(product, dto.currency) ?? '',
          description: product.description?.trim() ?? '',
          imageUrl: resolveImageUrl(product.image_url),
          productId: product.id,
          priceCents: product.price_cents,
        };
        const bucket = extras.get(sectionId) ?? [];
        bucket.push(line);
        extras.set(sectionId, bucket);
        covered.add(key);
        covered.add(familyName(key));
      }
    }

    if (extras.size === 0) {
      return merged;
    }
    return merged.map((section) => {
      const added = extras.get(section.id);
      if (!added?.length) {
        return section;
      }
      return { ...section, items: [...section.items, ...added] };
    });
  };

  const parseMinutes = (hhmm) => {
    const m = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) {
      return null;
    }
    let hours = Number(m[1]);
    const minutes = Number(m[2]);
    if (hours === 0 && minutes === 0) {
      hours = 24;
    }
    return hours * 60 + minutes;
  };

  const applyPosHours = (raw) => {
    if (!raw?.trim()) {
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    POS_DAY_KEYS.forEach((name) => {
      const key = POS_DAY_TO_KEY[name];
      const day = parsed[name];
      const row = DAYS.find((d) => d.key === key);
      if (!row) {
        return;
      }
      if (!day || day.closed) {
        row.open = 0;
        row.close = 0;
        row.label = 'Cerrado';
        return;
      }
      const open = parseMinutes(day.open);
      const close = parseMinutes(day.close);
      if (open == null || close == null) {
        return;
      }
      row.open = open;
      row.close = close;
      const openLabel = day.open.trim();
      const closeLabel = day.close.trim() === '00:00' ? '00:00' : day.close.trim();
      row.label = `${openLabel} — ${closeLabel}`;
    });

    document.querySelectorAll('[data-hours-row]').forEach((el) => {
      const key = Number(el.getAttribute('data-hours-row'));
      const row = DAYS.find((d) => d.key === key);
      if (!row) {
        return;
      }
      const compact = row.label.replace(/\s*—\s*/g, '–');
      const timeEl = el.querySelector('span:last-child, p:last-child');
      if (timeEl) {
        timeEl.textContent = el.tagName === 'ARTICLE' ? compact : row.label;
      }
    });
    applyHours();
  };

  const renderMenu = (sections) => {
    const nav = document.getElementById('carta-nav');
    const board = document.getElementById('carta-board');
    if (!nav || !board) {
      return;
    }

    nav.innerHTML = sections
      .map(
        (section) =>
          `<a href="#menu-${esc(section.id)}"><span class="material-symbols-outlined" aria-hidden="true">${
            section.icon || CAT_ICONS[section.id] || 'restaurant_menu'
          }</span>${esc(section.title)}</a>`,
      )
      .join('');

    board.innerHTML = sections
      .map((section) => {
        const items = section.items
          .map((item) => {
            const sizes = item.sizePrices?.length
              ? `<ul class="dish__sizes">${item.sizePrices
                  .map((row) => {
                    if (row.productId) {
                      catalogSet(row.productId, `${item.name} · ${row.label}`, row.priceCents);
                    }
                    const add = row.productId
                      ? `<button type="button" class="dish__add" data-add="${Number(row.productId)}">Añadir</button>`
                      : '';
                    return `<li><span>${esc(row.label)}</span><span>${esc(row.price)}</span>${add}</li>`;
                  })
                  .join('')}</ul>`
              : '';
            if (!item.sizePrices?.length && item.productId) {
              catalogSet(item.productId, item.name, item.priceCents);
            }
            const add = !item.sizePrices?.length && item.productId
              ? `<button type="button" class="dish__add" data-add="${Number(item.productId)}">Añadir</button>`
              : '';
            const photo = item.imageUrl
              ? `<img class="dish__photo" src="${esc(item.imageUrl)}" alt="${esc(item.name)}" loading="lazy" decoding="async" />`
              : '';
            const price = item.sizePrices?.length ? '' : `<span class="dish__price">${esc(item.price)}</span>`;
            const desc = item.description ? `<p class="dish__desc">${esc(item.description)}</p>` : '';
            return `<li class="dish${item.sizePrices?.length ? ' dish--sizes' : ''}">${photo}<div class="dish__body"><div class="dish__row"><h4 class="dish__name">${esc(
              item.name,
            )}</h4>${price}</div>${desc}${sizes}${add}</div></li>`;
          })
          .join('');
        const range = section.range ? `<span class="cat-block__range">${esc(section.range)}</span>` : '';
        return `<section class="cat-block" id="menu-${esc(section.id)}"><div class="cat-block__head"><h3>${esc(
          section.title,
        )}</h3>${range}</div><ul class="dish-grid">${items}</ul></section>`;
      })
      .join('');

    board.querySelectorAll('.dish__photo').forEach((img) => {
      img.addEventListener('error', () => {
        img.remove();
      });
    });
    paintCart();
  };

  const catalog = new Map();
  const CART_KEY = 'kf-cart-186';
  let deliveryFeeCents = 0;
  let postalRequired = false;
  let cartMode = 'delivery';

  const catalogSet = (id, name, priceCents) => {
    const productId = Number(id);
    const cents = Number(priceCents);
    if (!productId || !Number.isFinite(cents)) {
      return;
    }
    catalog.set(productId, { id: productId, name, priceCents: cents });
  };

  const readCart = () => {
    try {
      const raw = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((line) => line?.id && line.qty > 0) : [];
    } catch {
      return [];
    }
  };

  let cart = readCart();

  const saveCart = () => {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    paintCart();
  };

  const money = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  const cartCount = () => cart.reduce((sum, line) => sum + line.qty, 0);
  const cartSubtotal = () => cart.reduce((sum, line) => sum + line.priceCents * line.qty, 0);

  const ensureCartShell = () => {
    if (document.getElementById('cart-drawer')) {
      return;
    }
    document.body.insertAdjacentHTML(
      'beforeend',
      `<button type="button" class="cart-fab" id="cart-fab" hidden>
        <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
        Carrito <span class="cart-fab__count" id="cart-count">0</span>
      </button>
      <div class="cart-backdrop" id="cart-backdrop" hidden></div>
      <aside class="cart-drawer" id="cart-drawer" hidden aria-label="Tu pedido">
        <div class="cart-drawer__head">
          <h2>Tu pedido</h2>
          <button type="button" class="cart-drawer__close" id="cart-close" aria-label="Cerrar carrito">×</button>
        </div>
        <ul class="cart-lines" id="cart-lines"></ul>
        <p class="cart-total" id="cart-total"></p>
        <div class="cart-mode" role="group" aria-label="Cómo quieres el pedido">
          <button type="button" data-mode="delivery">A domicilio</button>
          <button type="button" data-mode="local">En el local</button>
        </div>
        <p class="cart-hint" id="cart-hint"></p>
        <form class="cart-form" id="cart-form">
          <label>Nombre<input name="name" autocomplete="name" /></label>
          <label>Teléfono<input name="phone" type="tel" required autocomplete="tel" placeholder="612 345 678" /></label>
          <label>Dirección<input name="address" required autocomplete="street-address" placeholder="Calle y número" /></label>
          <label>Código postal<input name="postal" inputmode="numeric" autocomplete="postal-code" placeholder="08915" /></label>
          <p class="cart-error" id="cart-error" hidden></p>
          <button type="submit" class="btn btn--primary" id="cart-submit">Continuar al pago</button>
        </form>
        <div class="cart-local" id="cart-local" hidden>
          <a class="btn btn--primary" href="${POS.tableMenu}" target="_blank" rel="noopener noreferrer">Pedir en el local</a>
        </div>
        <p class="cart-done" id="cart-done" hidden></p>
      </aside>`,
    );
    document.getElementById('cart-fab').addEventListener('click', () => setCartOpen(true));
    document.getElementById('cart-close').addEventListener('click', () => setCartOpen(false));
    document.getElementById('cart-backdrop').addEventListener('click', () => setCartOpen(false));
    document.getElementById('cart-lines').addEventListener('click', (event) => {
      const button = event.target.closest('[data-qty]');
      if (!button) {
        return;
      }
      const id = Number(button.getAttribute('data-id'));
      const delta = Number(button.getAttribute('data-qty'));
      const line = cart.find((row) => row.id === id);
      if (!line) {
        return;
      }
      line.qty = Math.min(20, line.qty + delta);
      if (line.qty <= 0) {
        cart = cart.filter((row) => row.id !== id);
      }
      saveCart();
    });
    document.getElementById('cart-form').addEventListener('submit', submitCart);
    document.querySelector('.cart-mode').addEventListener('click', (event) => {
      const button = event.target.closest('[data-mode]');
      if (!button) {
        return;
      }
      cartMode = button.getAttribute('data-mode') === 'local' ? 'local' : 'delivery';
      paintCart();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setCartOpen(false);
      }
    });
    document.getElementById('carta-board')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-add]');
      if (!button) {
        return;
      }
      const product = catalog.get(Number(button.getAttribute('data-add')));
      if (!product) {
        return;
      }
      const firstItem = cartCount() === 0;
      const line = cart.find((row) => row.id === product.id);
      if (line) {
        line.qty = Math.min(20, line.qty + 1);
      } else {
        cart.push({ id: product.id, name: product.name, priceCents: product.priceCents, qty: 1 });
      }
      saveCart();
      document.getElementById('cart-fab')?.classList.add('is-bump');
      window.setTimeout(() => document.getElementById('cart-fab')?.classList.remove('is-bump'), 280);
      if (firstItem) {
        setCartOpen(true);
      }
    });
  };

  const setCartOpen = (open) => {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (!drawer || !backdrop) {
      return;
    }
    drawer.hidden = !open;
    backdrop.hidden = !open;
    document.body.classList.toggle('cart-open', open);
  };

  const paintCart = () => {
    ensureCartShell();
    const count = cartCount();
    const fab = document.getElementById('cart-fab');
    const countEl = document.getElementById('cart-count');
    const lines = document.getElementById('cart-lines');
    const total = document.getElementById('cart-total');
    const form = document.getElementById('cart-form');
    if (!fab || !lines || !total || !form) {
      return;
    }
    fab.hidden = count === 0;
    countEl.textContent = String(count);
    document.querySelectorAll('[data-add]').forEach((button) => {
      const line = cart.find((row) => row.id === Number(button.getAttribute('data-add')));
      button.textContent = line ? `En el pedido · ${line.qty}` : 'Añadir';
      button.classList.toggle('is-in-cart', Boolean(line));
    });
    const delivery = cartMode === 'delivery';
    form.hidden = count === 0 || !delivery;
    const localPanel = document.getElementById('cart-local');
    if (localPanel) {
      localPanel.hidden = count === 0 || delivery;
    }
    document.querySelectorAll('.cart-mode [data-mode]').forEach((button) => {
      const on = button.getAttribute('data-mode') === cartMode;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const hint = document.getElementById('cart-hint');
    if (hint) {
      hint.hidden = count === 0;
      hint.textContent = delivery
        ? 'Te lo llevamos a casa. El siguiente paso es el pago en Satisfecho Delivery. Sin pago, el pedido no entra.'
        : 'Para la mesa o para llevar, sigue en la carta del local.';
    }
    if (count > 0) {
      document.getElementById('cart-done').hidden = true;
    }
    const postal = form.querySelector('[name="postal"]');
    if (postal) {
      postal.required = delivery && postalRequired;
    }
    if (count === 0) {
      lines.innerHTML = '<li class="cart-empty">Añade platos desde la carta.</li>';
      total.textContent = '';
      return;
    }
    lines.innerHTML = cart
      .map(
        (line) => `<li>
          <span class="cart-lines__name">${esc(line.name)}</span>
          <span class="cart-lines__qty">
            <button type="button" data-qty="-1" data-id="${line.id}" aria-label="Quitar uno">−</button>
            <span>${line.qty}</span>
            <button type="button" data-qty="1" data-id="${line.id}" aria-label="Añadir uno">+</button>
          </span>
          <span>${money(line.priceCents * line.qty)}</span>
        </li>`,
      )
      .join('');
    const fee = cartMode === 'delivery' && deliveryFeeCents > 0 ? deliveryFeeCents : 0;
    total.textContent =
      fee > 0
        ? `Platos ${money(cartSubtotal())} · envío ${money(fee)} · total ${money(cartSubtotal() + fee)}`
        : `Total ${money(cartSubtotal())}`;
  };

  const showCartError = (message) => {
    const el = document.getElementById('cart-error');
    if (!el) {
      return;
    }
    el.hidden = !message;
    el.textContent = message || '';
  };

  const submitCart = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    const phone = String(data.get('phone') || '').trim();
    const address = String(data.get('address') || '').trim();
    const name = String(data.get('name') || '').trim();
    const postal = String(data.get('postal') || '').trim();
    showCartError('');
    if (!cart.length) {
      return;
    }
    if (!phone) {
      showCartError('Hace falta el teléfono.');
      return;
    }
    if (!address) {
      showCartError('Hace falta la dirección.');
      return;
    }
    if (postalRequired && !postal) {
      showCartError('Hace falta el código postal.');
      return;
    }
    const params = new URLSearchParams();
    params.set('items', cart.map((line) => `${line.id}:${line.qty}`).join(','));
    if (name) {
      params.set('name', name);
    }
    params.set('phone', phone);
    params.set('address', address);
    if (postal) {
      params.set('postal', postal);
    }
    button.disabled = true;
    button.textContent = 'Enviando…';
    cart = [];
    sessionStorage.removeItem(CART_KEY);
    window.location.assign(`${POS.base}/delivery/${POS.tenantId}?${params.toString()}`);
  };

  const loadFromPos = async () => {
    renderMenu(cloneMenu(MENU_FALLBACK));
    try {
      const [menuRes, tenantRes] = await Promise.all([
        fetch(`${POS.base}/api/public/tenants/${POS.tenantId}/menu?lang=es`),
        fetch(`${POS.base}/api/public/tenants/${POS.tenantId}`),
      ]);
      if (menuRes.ok) {
        const dto = await menuRes.json();
        renderMenu(overlayFromPos(cloneMenu(MENU_FALLBACK), dto));
      }
      if (tenantRes.ok) {
        const tenant = await tenantRes.json();
        applyPosHours(tenant.opening_hours);
      }
      const feeRes = await fetch(`${POS.base}/api/public/tenants/${POS.tenantId}/satisfecho-delivery-config`);
      if (feeRes.ok) {
        const cfg = await feeRes.json();
        deliveryFeeCents = Number(cfg.delivery_fee_cents) || 0;
        postalRequired = Boolean(cfg.postal_codes_required);
        paintCart();
      }
    } catch {
      /* carta impresa + horario de Google */
    }
  };

  applyHours();
  setInterval(applyHours, 60_000);
  loadFromPos();
})();
