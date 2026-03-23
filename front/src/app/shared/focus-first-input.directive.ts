import { Directive, ElementRef, inject, Injector, afterNextRender } from '@angular/core';

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * When the host element is rendered (e.g. a modal with a form), focus the first
 * focusable form control (input, select, textarea). Use on modal content containers
 * so that when the dialog opens, the user can type immediately.
 *
 * Uses afterNextRender plus short deferred passes so focus wins over click-to-open
 * and async template content (e.g. @for rows).
 */
@Directive({
  selector: '[appFocusFirstInput]',
  standalone: true
})
export class FocusFirstInputDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  constructor() {
    afterNextRender(() => this.scheduleFocus(), { injector: this.injector });
  }

  private scheduleFocus(): void {
    const run = () => this.focusFirst();
    queueMicrotask(run);
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    window.setTimeout(run, 100);
  }

  private focusFirst(): void {
    const first = this.el.nativeElement.querySelector(FOCUSABLE) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;
    if (first && document.activeElement !== first) {
      first.focus({ preventScroll: true });
    }
  }
}
