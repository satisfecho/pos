import { Injectable, signal, computed } from '@angular/core';

export interface WaiterAlertItem {
  id: string;
  tableName: string;
  message: string;
  type: 'call_waiter' | 'payment_requested';
}

/**
 * Holds pending waiter/customer alerts so they persist across navigation.
 * Alerts stay until the user dismisses them; returning to Orders shows any unconfirmed alerts.
 */
@Injectable({ providedIn: 'root' })
export class WaiterAlertService {
  private nextId = 0;
  private _pending = signal<WaiterAlertItem[]>([]);

  readonly pending = this._pending.asReadonly();
  readonly hasPending = computed(() => this._pending().length > 0);
  readonly firstPending = computed(() => {
    const list = this._pending();
    return list.length > 0 ? list[0] : null;
  });

  add(tableName: string, message: string, type: 'call_waiter' | 'payment_requested'): WaiterAlertItem {
    const item: WaiterAlertItem = {
      id: `waiter-alert-${++this.nextId}-${Date.now()}`,
      tableName: tableName || 'Table',
      message: message || '',
      type,
    };
    this._pending.update(list => [...list, item]);
    return item;
  }

  remove(id: string): void {
    this._pending.update(list => list.filter(a => a.id !== id));
  }

  removeFirst(): WaiterAlertItem | null {
    const list = this._pending();
    if (list.length === 0) return null;
    const [first, ...rest] = list;
    this._pending.set(rest);
    return first;
  }

  clear(): void {
    this._pending.set([]);
  }
}
