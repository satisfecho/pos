import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { KitchenDisplayComponent } from './kitchen-display.component';
import { ApiService } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('KitchenDisplayComponent', () => {
  let orderUpdates$: Subject<unknown>;
  let mockApi: {
    getOrders: jasmine.Spy;
    connectWebSocket: jasmine.Spy;
    orderUpdates$: Subject<unknown>;
    getCurrentUser: jasmine.Spy;
    getKitchenStations: jasmine.Spy;
    getKitchenDisplaySettings: jasmine.Spy;
    setOrderStaffUrgent: jasmine.Spy;
  };
  let mockAudio: { setEnabled: jasmine.Spy; playRestaurantOrderChange: jasmine.Spy };

  beforeEach(async () => {
    orderUpdates$ = new Subject<unknown>();
    mockApi = {
      getOrders: jasmine.createSpy('getOrders').and.returnValue(of([])),
      connectWebSocket: jasmine.createSpy('connectWebSocket'),
      orderUpdates$,
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({ id: 1, role: 'kitchen' }),
      getKitchenStations: jasmine.createSpy('getKitchenStations').and.returnValue(of([])),
      getKitchenDisplaySettings: jasmine
        .createSpy('getKitchenDisplaySettings')
        .and.returnValue(of({ yellow_minutes: 5, orange_minutes: 10, red_minutes: 15 })),
      setOrderStaffUrgent: jasmine
        .createSpy('setOrderStaffUrgent')
        .and.callFake((id: number, urgent: boolean) => of({ order_id: id, staff_urgent: urgent })),
    };
    mockAudio = {
      setEnabled: jasmine.createSpy('setEnabled'),
      playRestaurantOrderChange: jasmine.createSpy('playRestaurantOrderChange'),
    };

    await TestBed.configureTestingModule({
      imports: [
        KitchenDisplayComponent,
        TranslateModule.forRoot(),
        RouterTestingModule.withRoutes([{ path: 'orders', children: [] }]),
      ],
      providers: [
        { provide: ApiService, useValue: mockApi },
        { provide: AudioService, useValue: mockAudio },
        {
          provide: PermissionService,
          useValue: {
            getCurrentUser: () => ({ id: 1, role: 'kitchen' }),
            hasPermission: () => false,
          },
        },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load orders on init', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    expect(mockApi.getOrders).toHaveBeenCalledWith(false);
  });

  it('should connect WebSocket on init', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    expect(mockApi.connectWebSocket).toHaveBeenCalled();
  });

  it('should set audio enabled from localStorage on init', () => {
    spyOn(localStorage, 'getItem').and.returnValue('false');
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    expect(mockAudio.setEnabled).toHaveBeenCalledWith(false);
  });

  it('should play sound when WebSocket emits new_order and sound is enabled', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    expect(mockAudio.playRestaurantOrderChange).not.toHaveBeenCalled();
    orderUpdates$.next({ type: 'new_order' });
    expect(mockAudio.playRestaurantOrderChange).toHaveBeenCalled();
  });

  it('should not play sound when sound is disabled and WebSocket emits', () => {
    spyOn(localStorage, 'getItem').and.returnValue('false');
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    mockAudio.playRestaurantOrderChange.calls.reset();
    orderUpdates$.next({ type: 'new_order' });
    expect(mockAudio.playRestaurantOrderChange).not.toHaveBeenCalled();
  });

  it('should refresh orders when WebSocket emits', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    mockApi.getOrders.calls.reset();
    orderUpdates$.next({ type: 'items_added' });
    expect(mockApi.getOrders).toHaveBeenCalledWith(false);
  });

  it('should filter to orders that have at least one pending or preparing item', () => {
    const orders = [
      {
        id: 1,
        status: 'pending',
        table_name: 'T1',
        created_at: new Date().toISOString(),
        items: [
          {
            id: 1,
            product_name: 'Coffee',
            quantity: 1,
            status: 'pending',
            price_cents: 100,
            category: 'Main Course',
          },
        ],
        total_cents: 100,
      },
      {
        id: 2,
        status: 'pending',
        table_name: 'T2',
        created_at: new Date().toISOString(),
        items: [
          {
            id: 2,
            product_name: 'Tea',
            quantity: 1,
            status: 'ready',
            price_cents: 80,
            category: 'Beverages',
          },
        ],
        total_cents: 80,
      },
      { id: 3, status: 'completed', table_name: 'T3', created_at: new Date().toISOString(), items: [], total_cents: 0 },
    ];
    mockApi.getOrders.and.returnValue(of(orders));
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.activeOrders().length).toBe(1);
    expect(fixture.componentInstance.activeOrders()[0].id).toBe(1);
  });

  it('should toggle sound and persist to localStorage', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    const setItemSpy = spyOn(localStorage, 'setItem');
    fixture.componentInstance.toggleSound({ target: { checked: false } } as unknown as Event);
    expect(mockAudio.setEnabled).toHaveBeenCalledWith(false);
    expect(setItemSpy).toHaveBeenCalledWith('kitchen-display-sound', 'false');
  });

  it('should auto-refresh after interval', fakeAsync(() => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    mockApi.getOrders.calls.reset();
    tick(15000);
    fixture.detectChanges();
    expect(mockApi.getOrders).toHaveBeenCalledWith(false);
  }));

  it('should not show full-page loading on background refresh', fakeAsync(() => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    fixture.componentInstance.loadOrders({ background: true });
    expect(fixture.componentInstance.loading()).toBe(false);
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(mockApi.getOrders).toHaveBeenCalled();
  }));

  it('should defer background refresh until item status dropdown closes', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    mockApi.getOrders.calls.reset();
    fixture.componentInstance.toggleItemStatusDropdown(1, 1);
    fixture.componentInstance.loadOrders({ background: true });
    expect(mockApi.getOrders).not.toHaveBeenCalled();
    mockApi.getOrders.calls.reset();
    fixture.componentInstance.toggleItemStatusDropdown(1, 1);
    expect(mockApi.getOrders).toHaveBeenCalledWith(false);
  });

  it('should call requestFullscreen when toggleFullscreen and not already fullscreen', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    const el = fixture.componentInstance.kitchenRootRef?.nativeElement as HTMLElement & {
      requestFullscreen: jasmine.Spy;
    };
    expect(el).toBeTruthy();
    const req = jasmine.createSpy('requestFullscreen').and.returnValue(Promise.resolve());
    el.requestFullscreen = req;
    fixture.componentInstance.toggleFullscreen();
    expect(req).toHaveBeenCalled();
  });

  it('should map elapsed time to SLA levels using timer thresholds', () => {
    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.timerSettings.set({ yellow_minutes: 5, orange_minutes: 10, red_minutes: 15 });
    const base = Date.now();
    c.now.set(base);
    const mk = (minutesAgo: number) =>
      ({
        id: 1,
        status: 'pending',
        table_name: 'T1',
        created_at: new Date(base - minutesAgo * 60_000).toISOString(),
        items: [],
        total_cents: 0,
      }) as any;
    expect(c.getSlaLevel(mk(1))).toBe('fresh');
    expect(c.getTimerColorClass(mk(1))).toBe('timer-green');
    expect(c.getSlaLevel(mk(6))).toBe('warning');
    expect(c.getSlaLevel(mk(12))).toBe('warning');
    expect(c.getSlaLevel(mk(20))).toBe('overdue');
    expect(c.formatPlacedClock(mk(0).created_at)).toMatch(/\d/);
  });

  it('should toggle staff urgent via API when permitted', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        KitchenDisplayComponent,
        TranslateModule.forRoot(),
        RouterTestingModule.withRoutes([{ path: 'orders', children: [] }]),
      ],
      providers: [
        { provide: ApiService, useValue: mockApi },
        { provide: AudioService, useValue: mockAudio },
        {
          provide: PermissionService,
          useValue: {
            getCurrentUser: () => ({ id: 1, role: 'admin' }),
            hasPermission: (_u: unknown, perm: string) => perm === 'order:update_status',
          },
        },
      ],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('en');
    translate.use('en');

    const fixture = TestBed.createComponent(KitchenDisplayComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.canMarkUrgent()).toBe(true);
    const order = {
      id: 42,
      status: 'pending',
      table_name: 'T1',
      created_at: new Date().toISOString(),
      items: [],
      total_cents: 0,
      staff_urgent: false,
    } as any;
    c.orders.set([order]);
    c.toggleStaffUrgent(order);
    expect(mockApi.setOrderStaffUrgent).toHaveBeenCalledWith(42, true);
    expect(c.orders()[0].staff_urgent).toBe(true);
  });
});
