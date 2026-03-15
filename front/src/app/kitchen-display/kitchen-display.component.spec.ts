import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { KitchenDisplayComponent } from './kitchen-display.component';
import { ApiService } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

describe('KitchenDisplayComponent', () => {
  let orderUpdates$: Subject<unknown>;
  let mockApi: { getOrders: jasmine.Spy; connectWebSocket: jasmine.Spy; orderUpdates$: Subject<unknown> };
  let mockAudio: { setEnabled: jasmine.Spy; playRestaurantOrderChange: jasmine.Spy };

  beforeEach(async () => {
    orderUpdates$ = new Subject<unknown>();
    mockApi = {
      getOrders: jasmine.createSpy('getOrders').and.returnValue(of([])),
      connectWebSocket: jasmine.createSpy('connectWebSocket'),
      orderUpdates$,
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

  it('should filter active orders only', () => {
    const orders = [
      { id: 1, status: 'pending', table_name: 'T1', created_at: new Date().toISOString(), items: [], total_cents: 0 },
      { id: 2, status: 'completed', table_name: 'T2', created_at: new Date().toISOString(), items: [], total_cents: 0 },
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
});
