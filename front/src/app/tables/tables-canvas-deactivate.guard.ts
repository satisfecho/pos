import { CanDeactivateFn } from '@angular/router';

/** Implemented by `TablesCanvasComponent` for route exit without importing that module eagerly. */
export interface TablesCanvasCanDeactivateContract {
  confirmCanDeactivate(): boolean | Promise<boolean>;
}

export const tablesCanvasCanDeactivate: CanDeactivateFn<TablesCanvasCanDeactivateContract> = component =>
  component.confirmCanDeactivate();
