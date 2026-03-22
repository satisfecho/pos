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
import { intlLocaleFromTranslate } from '../shared/intl-locale';

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

  /** Bumps when UI language changes so currency/date formatting refreshes. */
  private reportIntlRevision = signal(0);

  ngOnInit() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    this.fromDate.set(this.fmtDate(from));
    this.toDate.set(this.fmtDate(to));
    this.loadTenantCurrency();
    this.loadReport();
    this.translate.onLangChange.subscribe(() => this.reportIntlRevision.update((n) => n + 1));
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
    void this.reportIntlRevision();
    const code = this.currencyCode();
    const locale = intlLocaleFromTranslate(this.translate);
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
    void this.reportIntlRevision();
    const d = new Date(iso);
    return d.toLocaleDateString(intlLocaleFromTranslate(this.translate), {
      month: 'short',
      day: 'numeric',
    });
  }

  getReservationSourceLabel(source: string): string {
    if (source === 'public') return this.translate.instant('REPORTS.RESERVATIONS_SOURCE_PUBLIC');
    if (source === 'staff') return this.translate.instant('REPORTS.RESERVATIONS_SOURCE_STAFF');
    return source;
  }

  getReservationStatusLabel(status: string): string {
    const key = `RESERVATIONS.STATUS_${status.toUpperCase().replace(/-/g, '_')}`;
    const t = this.translate.instant(key);
    return t !== key ? t : status;
  }

  barWidth(cents: number): string {
    const max = this.maxBarValue();
    if (max <= 0) return '0%';
    return `${Math.min(100, (cents / max) * 100)}%`;
  }

  /** SVG chart dimensions (content area; padding for labels). */
  readonly chartPad = { left: 44, right: 12, top: 12, bottom: 28 };
  readonly chartWidth = 520;
  readonly chartHeight = 200;

  /** Revenue-over-time: polyline points for SVG (x,y from daily data). */
  revenueChartPoints(): string {
    const r = this.report();
    if (!r?.summary.daily?.length) return '';
    const daily = r.summary.daily;
    const maxRev = Math.max(1, ...daily.map((d) => d.revenue_cents));
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    const points = daily.map((d, i) => {
      const x = this.chartPad.left + (i / (daily.length - 1 || 1)) * w;
      const y = this.chartPad.top + h - (d.revenue_cents / maxRev) * h;
      return `${x},${y}`;
    });
    return points.join(' ');
  }

  /** Revenue-over-time: area path (fill under the line). */
  revenueChartAreaPath(): string {
    const r = this.report();
    if (!r?.summary.daily?.length) return '';
    const daily = r.summary.daily;
    const maxRev = Math.max(1, ...daily.map((d) => d.revenue_cents));
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    const baseY = this.chartPad.top + h;
    const firstX = this.chartPad.left;
    const lastX = this.chartPad.left + w;
    const points = daily.map((d, i) => {
      const x = this.chartPad.left + (i / (daily.length - 1 || 1)) * w;
      const y = this.chartPad.top + h - (d.revenue_cents / maxRev) * h;
      return `${x},${y}`;
    });
    return `M ${firstX},${baseY} L ${points.join(' L ')} L ${lastX},${baseY} Z`;
  }

  /** Y-axis ticks for revenue chart (0, ~50%, 100% of max). */
  revenueChartYLabels(): { value: number; y: number }[] {
    const r = this.report();
    if (!r?.summary.daily?.length) return [];
    const maxRev = Math.max(1, ...r.summary.daily.map((d) => d.revenue_cents));
    const h = this.chartHeight - this.chartPad.top - this.chartPad.bottom;
    return [
      { value: maxRev, y: this.chartPad.top },
      { value: Math.round(maxRev / 2), y: this.chartPad.top + h / 2 },
      { value: 0, y: this.chartPad.top + h },
    ];
  }

  /** X-axis date labels (first, middle, last) for revenue chart. */
  revenueChartXLabels(): { date: string; x: number }[] {
    const r = this.report();
    if (!r?.summary.daily?.length) return [];
    const daily = r.summary.daily;
    const w = this.chartWidth - this.chartPad.left - this.chartPad.right;
    const indices = daily.length === 1 ? [0] : [0, Math.floor((daily.length - 1) / 2), daily.length - 1];
    return indices.map((i) => ({
      date: this.formatShortDate(daily[i].date),
      x: this.chartPad.left + (i / (daily.length - 1 || 1)) * w,
    }));
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
    this.api.getReportsExport(from, to, 'xlsx', 'summary', this.translate.currentLang).subscribe({
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
    this.api.getReportsExport(from, to, 'csv', report, this.translate.currentLang).subscribe({
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
