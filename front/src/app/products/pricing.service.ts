import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UnitOfMeasure } from '../inventory/inventory.types';

export type PricingTargetKind = 'pour' | 'margin' | 'markup';

export interface PricingSuggestResponse {
  mode: 'recipe' | 'simulate';
  product_id: number | null;
  cost_per_serving_cents: number;
  suggested_price_cents: number;
  profit_per_serving_cents: number;
  pour_cost_pct: number;
  margin_pct: number;
  markup_pct: number;
  servings_in_container: number | null;
  break_even_servings: number | null;
  total_profit_if_sold_out_cents: number | null;
}

export interface PricingSimulateRequest {
  container_cost_cents: number;
  container_quantity: string;
  container_unit: UnitOfMeasure;
  serving_quantity: string;
  serving_unit: UnitOfMeasure;
  target_pour_cost_pct?: number | null;
  target_margin_pct?: number | null;
  target_markup_pct?: number | null;
  extra_fixed_cents: number;
  waste_pct: number;
  rounding_step_cents: number | null;
}

export interface PricingSuggestQuery {
  targetPourCostPct?: number | null;
  targetMarginPct?: number | null;
  targetMarkupPct?: number | null;
  extraFixedCents?: number;
  wastePct?: number;
  roundingStepCents?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PricingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/pricing`;

  suggestProduct(productId: number, q: PricingSuggestQuery): Observable<PricingSuggestResponse> {
    let params = new HttpParams();
    if (q.targetPourCostPct != null) params = params.set('target_pour_cost_pct', String(q.targetPourCostPct));
    if (q.targetMarginPct != null) params = params.set('target_margin_pct', String(q.targetMarginPct));
    if (q.targetMarkupPct != null) params = params.set('target_markup_pct', String(q.targetMarkupPct));
    if (q.extraFixedCents != null && q.extraFixedCents > 0) {
      params = params.set('extra_fixed_cents', String(q.extraFixedCents));
    }
    if (q.wastePct != null && q.wastePct !== 0) {
      params = params.set('waste_pct', String(q.wastePct));
    }
    if (q.roundingStepCents != null) {
      params = params.set('rounding_step_cents', String(q.roundingStepCents));
    }
    return this.http.get<PricingSuggestResponse>(`${this.base}/product/${productId}/suggest`, { params });
  }

  simulate(body: PricingSimulateRequest): Observable<PricingSuggestResponse> {
    return this.http.post<PricingSuggestResponse>(`${this.base}/simulate`, body);
  }
}
