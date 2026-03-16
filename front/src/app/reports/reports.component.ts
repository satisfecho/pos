/**
 * Sales & Revenue Reports
 *
 * Date range, summary, by product/category/table/waiter.
 * Simple catchy CSS charts; export CSV/Excel.
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar.component';
import { ApiService, SalesReport } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TranslateModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  report = signal<SalesReport | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  exporting = signal(false);
  fromDate = signal('');
  toDate = signal('');
  currency = signal('€');
  currencyCode = signal<string | null>(null);

  maxBarValue = computed(() => {
    const r = this.report();
    if (!r) return 1;
    const dailyMax = r.summary.daily.length
      ? Math.max(...r.summary.daily.map((d) => d.revenue_cents))
      : 0;
    const productMax = r.by_product.length
      ? Math.max(...r.by_product.map((p) => p.revenue_cents))
      : 0;
    return Math.max(1, dailyMax, productMax);
  });

  totalProductQuantity = computed(() => {
    const r = this.report();
    if (!r?.by_product?.length) return 0;
    return r.by_product.reduce((sum, p) => sum + p.quantity, 0);
  });

  totalCategoryQuantity = computed(() => {
    const r = this.report();
    if (!r?.by_category?.length) return 0;
    return r.by_category.reduce((sum, c) => sum + c.quantity, 0);
  });

  ngOnInit() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    this.fromDate.set(this.fmtDate(from));
    this.toDate.set(this.fmtDate(to));
    this.loadTenantCurrency();
    this.loadReport();
  }

  private fmtDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private loadTenantCurrency() {
    this.api.getTenantSettings().subscribe({
      next: (s) => {
        this.currency.set(s.currency || '€');
        this.currencyCode.set(s.currency_code || null);
      },
    });
  }

  loadReport() {
    const from = this.fromDate();
    const to = this.toDate();
    if (!from || !to) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getSalesReports(from, to).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load report');
        this.loading.set(false);
      },
    });
  }

  formatCurrency(cents: number): string {
    const code = this.currencyCode();
    const locale = navigator.language || 'en-US';
    if (code) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'symbol',
      }).format(cents / 100);
    }
    return `${this.currency()}${(cents / 100).toFixed(2)}`;
  }

  formatShortDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  getReservationSourceLabel(source: string): string {
    if (source === 'public') return this.translate.instant('REPORTS.RESERVATIONS_SOURCE_PUBLIC');
    if (source === 'staff') return this.translate.instant('REPORTS.RESERVATIONS_SOURCE_STAFF');
    return source;
  }

  barWidth(cents: number): string {
    const max = this.maxBarValue();
    if (max <= 0) return '0%';
    return `${Math.min(100, (cents / max) * 100)}%`;
  }

  /** Format value as percentage of total (e.g. "12.3%" or "0%"). */
  formatPct(value: number, total: number): string {
    if (total <= 0) return '0%';
    const pct = (value / total) * 100;
    return pct >= 100 ? '100%' : pct <= 0 ? '0%' : `${pct.toFixed(1)}%`;
  }

  exportCSV() {
    this.export('csv', 'summary');
  }

  exportExcel() {
    this.exporting.set(true);
    const from = this.fromDate();
    const to = this.toDate();
    this.api.getReportsExport(from, to, 'xlsx', 'summary').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos2-sales-${from}-${to}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  private export(format: 'csv' | 'xlsx', report: string) {
    if (format === 'xlsx') {
      this.exportExcel();
      return;
    }
    this.exporting.set(true);
    const from = this.fromDate();
    const to = this.toDate();
    this.api.getReportsExport(from, to, 'csv', report).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pos2-sales-${report}-${from}-${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }
}
